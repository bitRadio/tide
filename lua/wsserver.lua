--[[
   ----------------------------------------------------------------------
   tide: An online Lua/Torch7 REPL.
   Copyright: MIT, Ali Sabri Sanal, 2015
   -----------------------------------------------------------------------
--]]
local fs = require 'path.fs'
local cjson = require 'cjson'

local print = print
oldprint = print
local decode = cjson.decode
local encode = cjson.encode
local random = math.random

local repl = require './lua/repl'

local logincount = 0
local co
local opened = false
local sessionid

local home = os.getenv 'HOME'
local curdir = fs.getcwd()

local config = {}
local luarc =  home..'/.luarc.lua'
local f = io.open(luarc,'r')
if f then
   local cont = f:read( "*a" )
   io.close(f)
   local status, msg = loadstring('return ' .. cont)
   if status then
      config = status()
   end
end

users = {}

local function seed()
   local seed = os.time()
   local maxsint = 2^31
   if seed>maxsint then
      seed = seed - math.floor(seed/maxsint)*maxsint
   end
   math.randomseed(seed)
   math.random()
   math.random()
end

seed()

-- from Jacob Rus's (jrus) lua-uuid.lua https://gist.github.com/jrus
local function uuid()
    local template ='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxx'
    return string.gsub(template, '[xy]', function (c)
        local v = (c == 'x') and random(0, 0xf) or random(8, 0xb)
        return string.format('%x', v)
    end)
end

local function savesessionid(id)
   local file = io.open("sessionid.txt", "w")
   if id then
      file:write(id)
   end
   file:close()
end

local function readsessionid()
   local file = io.open("sessionid.txt", "r")
   local id  = file:read()
   print("sessionid", id)
   file:close()
   return id
end


local function traceback(message)
   local tp = type(message)
   if tp ~= "string" and tp ~= "number" then return message end
   local debug = _G.debug
   if type(debug) ~= "table" then return message end
   local tb = debug.traceback
   if type(tb) ~= "function" then return message end
   return tb(message)
end

local function startsession(user)
   if opened == false then
      sessionid = uuid()
      savesessionid(sessionid)
      opened = true
   end
end

function login(cmd)
   logincount = logincount+1
   if cmd.pass==config.login.password and cmd.user==config.login.user then
      logincount = 0;
      startsession()
      print("session started", sessionid)
      repl:send({type='start', data={sessionid=sessionid, cport=config.control_port}})
      return true
   end
   local try = config.login.count or 3
   if logincount >= try then
      return false
   end
   return true
end

local function onmessage(m)

   if config.torch then
      torch = require 'torch'
   end
   local msg = decode(m.data)
   local err, st

   if msg.type=='login' then
      return login(msg.data)

   elseif msg.type=='session' then
      repl:sendHistory()

   elseif msg.type=='eval' then
      co = coroutine.create(repl.eval)
      st, err = coroutine.resume(co, repl, msg.data)
   elseif msg.type == 'write' then
      repl:feedInput(msg.data)
      st, err = coroutine.resume(co)
      if coroutine.status(co) == 'dead' then
         co = nil
      end
   elseif msg.type == 'ctrl' then
      repl:feedInput(msg.data)
      st, err = coroutine.resume(co, '^D')
      if coroutine.status(co) == 'dead' then
         co = nil
      end
   else
      local retval = repl[msg.type](repl, msg.data)
      if retval then
         repl:send(retval)
      end
   end
   return true
end

local function onready(conn)
   print("conn", conn.client)
   logincount = 0
   repl:init(config, mg)
   if config.login then
      repl:send({type='login', data=false})
   else
      startsession()
      repl:send({type='start', data={sessionid=sessionid, cport=config.control_port}})
   end
end

function data(m)
   local st, err = xpcall(function() return onmessage(m) end, traceback)
   if not st then
       repl:send({type='error', data=err})
       return false
   else
      return err
   end
end

function open(conn)
--[[  
   local cookie = conn.request_info.http_headers.Cookie
   local i, j, id = string.find(cookie, 'sessionid%s*=%s*(%w+)')
   if opened == true and id ~= readsessionid() then
--]]
   if opened == true then
      return false
   end
   return true
end


function ready(conn)
   local st, err = xpcall(onready, traceback, conn)
   if not st then
      print(err)
   end
   --mg.set_timeout("timer()", 2)
   return true -- return true to keep the connection open
end

function close(conn)
   opened = false
   print("websocket close")
   savesessionid()
end

function timer()
   local date = os.date('*t');
   local hand = (date.hour%12)*60+date.min;

   mg.write("ping", string.format("%u:%02u:%02u", date.hour, date.min, date.sec))
   mg.set_timeout("timer()", 2)
   return true -- return true to keep an interval timer running
end
