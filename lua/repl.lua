--[[
   ----------------------------------------------------------------------
   tide: An online Lua/Torch7 REPL.
   Copyright: MIT, Ali Sabri Sanal, 2015
   -----------------------------------------------------------------------
--]]

local lsh = require './lua/mluaish' --modified from (c) Steve Donovan's luaish.lua
local mp = require 'MessagePack'
local encode = mp.pack

local repl = {}

local oldio = io

mp.packers['function'] = function(buffer, fnc)
   local typ, data = fnc()
   return mp.packers[typ](buffer, data)
end
mp.set_number('float')

-- input buffer
local rb = {
   i=1,
   str='',
   append = function(self, s)
      if self.i>1 then
         self.str = self.str:sub(self.i)
         self.i = 1
      end
      self.str = self.str .. s
   end,
   init = function(self)
      self.i = 1
      self.str = ''
   end
}

-- i/o functions
io = {}
for k, v in pairs(oldio) do
   io[k]=v
end

io.write =  function(...)
   if io.output() == io.stdout then
      local tbl = {}
      for i = 1,select('#',...) do
         local obj = select(i,...)
         local tp = type(obj)
         if tp ~= 'string' and tp ~= 'number' then
            return error(string.format("bad argument #%d to 'write' (string expected, got %s)",i ,tp))
         end
         table.insert(tbl, obj)
      end
      repl:send({type='output', data=table.concat(tbl, '')})
      return true
   end
   return io.output():write(...)
end

-- (c) Steve Donovan pl.stringio --------------------------

local unpack = unpack or table.unpack

local tuple = table.pack or function(...)
   return {n=select('#', ...), ...}
end

io.read = function(...)
   if io.input() == io.stdin then
      local res, fmts = {}, tuple(...)
      if fmts.n == 0 then
         fmts[1]="*l"
         fmts.n = 1
      end
      for k = 1, fmts.n do
         local fmt = fmts[k]
         if fmt == '*l' or fmt == '*L' then
            while not rb.str:find('\n', rb.i) or rb.i>#rb.str do
               repl:send({type='input', data=true})
               if coroutine.yield() == '^D' then break end
            end
            local idx = rb.str:find('\n',rb.i)
            res[k] = rb.str:sub(rb.i, fmt == '*l' and idx-1 or idx)
            rb.i = idx+1
         elseif fmt == '*a' then
            local tst
            while tst ~= '^D' do
               repl:send({type='input', data=true})
               tst = coroutine.yield()
            end
            res[k] = rb.str:sub(rb.i)
            rb.i = #rb.str
         elseif fmt == '*n' then
            while rb.i>#rb.str do
               repl:send({type='input', data=true})
               if coroutine.yield() == '^D' then break end
            end
            local _,i2,i2,idx
            _,idx = rb.str:find ('%s*%d+',rb.i)
            _,i2 = rb.str:find ('^%.%d+',idx+1)
            if i2 then idx = i2 end
            _,i2 = rb.str:find ('^[eE][%+%-]*%d+',idx+1)
            if i2 then idx = i2 end
            local val = rb.str:sub(rb.i,idx)
            res[k] = tonumber(val)
            rb.i = idx+1
         elseif type(fmt) == 'number' then
            while (rb.i+fmt-1)>#rb.str do
               repl:send({type='input', data=true})
               if coroutine.yield() == '^D' then break end
            end
            res[k] = str:sub(i,i+fmt-1)
            self.i = i + fmt
         else
            return error(string.format("bad argument #%d to 'read' (invalid option)", k))
         end
      end
      return unpack(res)
   else
      return io.input():read(...)
   end
end
-----------------------------------------------------------

function print(...)
   local tbl, t= {}, tuple(...)
   for i=1, t.n do
      local obj = t[i]
      if type(obj) ~= 'string' then
         obj = tostring(obj)
      end
      table.insert(tbl, obj)
   end
   local data = string.format("%s\n", table.concat(tbl, '\t'))
   repl:send({type='output', data=data})
end


-- Tracekback (error printout)
local function traceback(message)
   local tp = type(message)
   if tp ~= "string" and tp ~= "number" then return message end
   local debug = _G.debug
   if type(debug) ~= "table" then return message end
   local tb = debug.traceback
   if type(tb) ~= "function" then return message end
   return tb(message,2)
end

-- (c) David Manura, 2008-08 lua.lua----------------

local function docall(f)
   local F = function() return f() end
   local result = tuple(xpcall(F, traceback))
   -- force a complete garbage collection in case of errors
   --if not result[1] then collectgarbage("collect") end
   return unpack(result, 1, result.n)
end

---------------------------------------------------

function repl:init(config, ws)
   self.ws = ws
   if config.torch then
      if config.trepl then
         self.trepl = require './lua/mtrepl'
         self.timer = config.trepl.timer
         self.trepl.init(config.trepl)
      end
      if config.images==true then
         self.utils = require './lua/imageutil'
         self.utils.init(self)
      end
   end
   self.config = config
   lsh.add_shortcuts(config.shortcuts)
   rb:init()
end

function repl:sendHistory()
   local count = self.config.keeplines or 500
   local f, err = io.open(lsh.history,'r')
   if f then
      local st, err = f:read( "*a" )
      f:close()
      local lines = {}
      if st then
         for i in string.gmatch(st, "[^\n]+") do
            table.insert(lines, i)
         end
      end
      local b = 1
      if #lines>count then
         b = #lines-count+1
         local trunc = table.concat(lines, '\n', b)
         trunc = trunc .. "\n"
         f = io.open(lsh.history, 'w+')
         f:write(trunc)
         f:close()
      end
      local data = table.concat(lines, '\n', b)
      lsh.last_line = lines[#lines]
      return self:send({type='histo', data=data})
   end
end

function repl:load(res)
   lsh.saveline('.load ' .. res)
   local f, err = io.open(res,'r')
   local st
   if f then
      st, err = f:read( "*a" )
      io.close(f)
      if st then
         return self:send({type='load', data=st})
      end
   end
   self:send({type='error', data=err})
end

function repl:save(res)
   lsh.saveline('.save ' .. res.name)
   local f, err = io.open(res.name,'w')
   local st
   if f then
      st, err = f:write(res.text)
      io.close(f)
      if st then
         return self:send({type='save', data='ok'})
      end
   end
   self:send({type='error', data=err})
end

function repl:hint(res)
   local retval = lsh.completion_handler(res)
   self:send({type='hint', data=retval})
end

function repl:indent(res)
   local retval = 0
   if res then
      if res:find('^%s-%.') then
         return self:send({type="indent", data=false})
      end
      if res and res:find('^%s-=') then
         res = res:gsub('^%s-=','')
      end
      if loadstring(res) or loadstring('return ' .. res) then
         retval=false
      end
   end
   self:send({type="indent", data=retval})
end

---[[
-- The repl
function repl:eval(line) 
   local sv = true
   -- Timer
   local timer_start, timer_stop
   if torch and self.timer == true then
      local t = torch.Timer()
      local start = 0
      timer_start = function()
         start = t:time().real
      end
      timer_stop = function()
         local step = t:time().real - start
         self.trepl.printTime(step)
      end
   else
      timer_start = function() end
      timer_stop = function() end
   end

   if type(line) == 'table' then
      sv = line.save
      line = line.data
   end
   if line and line:find('^%s-%.') then
      lsh.checkline(line)
      return self:send({type='result', data=''})
   end

   if line and line:find('^%s-=') then
      line = line:gsub('^%s-=','return ')
   end

   -- EVAL:
   timer_start()
   if line then
      local status, msg = loadstring(line)
      if not status then
         local tmsg
         status, tmsg = loadstring('return ' .. line)
      end
      if status then
         local res = tuple(docall(status))
         status, msg = res[1], res[2]
         if status then
            if res.n > 1 then
               print(unpack(res, 2, res.n))
            end
         else
            return self:send({type='error', data=msg})
         end
      else
         return self:send({type='error', data='syntax error: ' .. msg})
      end
   end
   timer_stop()

   if sv==true then
      lsh.saveline(line)
   end
   self:send({type='result', data=''})
end

function repl:send(msg)
   self.ws.write("bin", encode(msg))
end

function repl:feedInput(data)
   rb:append(data)
end

function repl:initInput()
   rb:init()
end

return repl





