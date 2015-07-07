--[[
   This code has been modified by Ali Sabri Sanal
   from "trepl" (https://github.com/torch/trepl)
   in order to work with "tide", 2015   

   trepl :
   Copyright: MIT / BSD / Do whatever you want with it.
   Clement Farabet, 2013
--]]

-- Colors:
local colors = require './lua/mcolors'
local col = require './lua/colorize'

local trepl = {}

-- Kill colors:
local function noColors()
  for k,v in pairs(colors) do
    colors[k] = ''
  end
end

-- helper
local function sizestr(x)
  local strt = {}
  if _G.torch.typename(x):find('torch.*Storage') then
    return _G.torch.typename(x):match('torch%.(.+)') .. ' - size: ' .. x:size()
  end
  if x:nDimension() == 0 then
    table.insert(strt, _G.torch.typename(x):match('torch%.(.+)') .. ' - empty')
  else
    table.insert(strt, _G.torch.typename(x):match('torch%.(.+)') .. ' - size: ')
    for i=1,x:nDimension() do
      table.insert(strt, x:size(i))
      if i ~= x:nDimension() then
        table.insert(strt, 'x')
      end
    end
  end
  return table.concat(strt)
end

-- k : name of variable
-- m : max length
local function printvar(key,val,m)
  local name = '[' .. tostring(key) .. ']'
  --io.write(name)
  name = name .. string.rep(' ',m-name:len()+2)
  local tp = type(val)
  if tp == 'userdata' then
    tp = torch.typename(val) or ''
    if tp:find('torch.*Tensor') then
      tp = sizestr(val)
    elseif tp:find('torch.*Storage') then
      tp = sizestr(val)
    else
      tp = tostring(val)
    end
  elseif tp == 'table' then
    if torch.type(val) == 'table' then
      tp = tp .. ' - size: ' .. #val
    else
      tp = torch.type(val)
    end
  elseif tp == 'string' then
    local tostr = val:gsub('\n','\\n')
    if #tostr>40 then
      tostr = tostr:sub(1,40) .. '...'
    end
    tp = tp .. ' : "' .. tostr .. '"'
  else
    tp = tostring(val)
  end
  return name .. ' = ' .. tp
end

-- helper
local function getmaxlen(vars)
  local m = 0
  if type(vars) ~= 'table' then return tostring(vars):len() end
  for k,v in pairs(vars) do
    local s = tostring(k)
    if s:len() > m then
      m = s:len()
    end
  end
  return m
end

-- a function to colorize output:
local function colorize(object,nested)
  -- Apply:
  local apply = col

  -- Type?
  if object == nil then
    return apply['Black']('nil')
  elseif type(object) == 'number' then
    return apply['cyan'](tostring(object))
  elseif type(object) == 'boolean' then
    return apply['blue'](tostring(object))
  elseif type(object) == 'string' then
    if nested then
      return apply['Black']('"')..apply['green'](object)..apply['Black']('"')
    else
      return apply['none'](object)
    end
  elseif type(object) == 'function' then
    return apply['magenta'](tostring(object))
  elseif type(object) == 'userdata' or type(object) == 'cdata' then
    local tp = torch.typename(object) or ''
    if tp:find('torch.*Tensor') then
      tp = sizestr(object)
    elseif tp:find('torch.*Storage') then
      tp = sizestr(object)
    else
      tp = tostring(object)
    end
    if tp ~= '' then
      return apply['red'](tp)
    else
      return apply['red'](tostring(object))
    end
  elseif type(object) == 'table' then
    return apply['green'](tostring(object))
  else
    return apply['_black'](tostring(object))
  end
end

-- This is a new recursive, colored print.
local ndepth = 4
function cprint(...)
  local function rawprint(o)
    io.write(tostring(o or '') .. '\n')
  end
  local objs = {...}
  local function printrecursive(obj,depth)
    local depth = depth or 0
    local tab = depth*4
    local line = function(s) for i=1,tab do io.write(' ') end rawprint(s) end
    if next(obj) then
      line('{')
      tab = tab+2
      for k,v in pairs(obj) do
        if type(v) == 'table' then
          if depth >= (ndepth-1) or next(v) == nil then
            line(tostring(k) .. ' : {...}')
          else
            line(tostring(k) .. ' : ') printrecursive(v,depth+1)
          end
        else
          line(tostring(k) .. ' : ' .. colorize(v,true))
        end
      end
      tab = tab-2
      line('}')
    else
      line('{}')
    end
  end
  for i = 1,select('#',...) do
    local obj = select(i,...)
    if type(obj) ~= 'table' then
      if type(obj) == 'userdata' or type(obj) == 'cdata' then
        rawprint(obj)
      else
        io.write(colorize(obj) .. '\t')
        if i == select('#',...) then
          rawprint()
        end
      end
    elseif getmetatable(obj) and getmetatable(obj).__tostring then
      rawprint(obj)
    else
      printrecursive(obj)
    end
  end
end

function setprintlevel(n)
  if n == nil or n < 0 then
    error('expected number [0,+)')
  end
  n = math.floor(n)
  ndepth = n
end

setprintlevel(5)

-- Import, ala Python
function import(package, forced)
  local ret = require(package)
  local symbols = {}
  if _G[package] then
    _G._torchimport = _G._torchimport or {}
    _G._torchimport[package] = _G[package]
    symbols = _G[package]
  elseif ret and type(ret) == 'table' then
    _G._torchimport = _G._torchimport or {}
    _G._torchimport[package] = ret
    symbols = ret
  end
  for k,v in pairs(symbols) do
    if not _G[k] or forced then
      _G[k] = v
    end
  end
end

-- Who
-- a simple function that prints all the symbols defined by the user
-- very much like Matlab's who function
function who(system)
  local m = getmaxlen(_G)
  local p = _G._preloaded_
  local function getsymb(sys)
    local tbl = {}
    for k,v in pairs(_G) do
      if (sys and p[k]) or (not sys and not p[k]) then
        table.insert(tbl, printvar(k,_G[k],m))
      end
    end
    return table.concat(tbl, '\n')
  end
  if system then
    print('-- System Variables --')
    print(getsymb(true))
  end
  print('-- User Variables --')
  print(getsymb(false))
end

-- Monitor Globals
function monitor_G()

  -- Store current globals:
  local evercreated = {}
  for k in pairs(_G) do
    evercreated[k] = true
  end

  -- Overwrite global namespace meta tables to monitor it:
  setmetatable(_G, {
    __newindex = function(G,key,val)
      if not evercreated[key] then
        local file = debug.getinfo(2).source:gsub('^@','')
        local line = debug.getinfo(2).currentline
        if line > 0 then
          print(colors.red .. 'created global variable: '
            .. colors.blue .. key .. colors.none
            .. ' @ ' .. colors.magenta .. file .. colors.none
            .. ':' .. colors.green .. line .. colors.none
          )
        else
          print(colors.red .. 'created global variable: '
            .. colors.blue .. key .. colors.none
            .. ' @ ' .. colors.yellow .. '[C-module]' .. colors.none
          )
        end
      end
      evercreated[key] = true
      rawset(G,key,val)
    end,
    __index = function (table, key)
      local file = debug.getinfo(2).source:gsub('^@','')
      local line = debug.getinfo(2).currentline
      if line > 0 then
        print(colors.red .. 'atempt to read undeclared variable: '
          .. colors.blue .. key .. colors.none
          .. ' @ ' .. colors.magenta .. file .. colors.none
          .. ':' .. colors.green .. line .. colors.none
        )
      else
        print(colors.red .. 'atempt to read undeclared variable: '
          .. colors.blue .. key .. colors.none
          .. ' @ ' .. colors.yellow .. '[C-module]' .. colors.none
        )
      end
    end,
  })
end

-- Store preloaded symbols, for who()
_G._preloaded_ = {}
for k,v in pairs(_G) do
  _G._preloaded_[k] = true
end

function trepl.printTime(step)
  print('                 ', col.Black(string.format('[%0.04fs]', step)))
end

function trepl.init(conf)
  if conf.globals == true then
    monitor_G()
  end
  if conf.color == false then
    noColors()
  end
end

return trepl




