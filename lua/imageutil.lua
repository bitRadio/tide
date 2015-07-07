--[[
   This code has been modified by Ali Sabri Sanal
   from "gfx.js" (https://github.com/clementfarabet/gfx.js)

   gfx.js :
   Copyright (c) 2013, Clement Farabet (https://github.com/clementfarabet/)
   Copyright (c) 2012-2013, Christopher Jeffrey (https://github.com/chjj/)
--]]

local image = require 'image'
local base64 = mg.base64_encode

local repl
local util = {}

local function uid()
   return 'dom_' .. tostring(os.time()):gsub('%.','')
end

function display(img, opts)
   if type(img) == 'string' then 
      img = image.load(img)
   end
   if type(img) == 'table' or torch.isTensor(img) then
      opts = opts or {input=img, padding=2}
      opts.input = img
      local zoom = opts.zoom or 1
      local win = opts.id or uid()
      local legend = opts.legend
      local nimg = image.toDisplayTensor(opts)
      if nimg:dim() == 2 then
         nimg = nimg:view(1, nimg:size(1), nimg:size(2))
      end

      local width, height

      if nimg:nDimension() == 2 then
         --oldprint("dim2", nimg:size(1), nimg:size(2))
         width = nimg:size(2) * zoom
         height = nimg:size(1) * zoom
      elseif nimg:nDimension() == 3 then
         --oldprint("dim3", nimg:size(2), nimg:size(3))
         width = nimg:size(3) * zoom
         height = nimg:size(2) * zoom
      end

      local myimg = image.compressJPG(nimg, 100)

      local tbl =  {
         width = math.floor(width+0.5),
         height = math.floor(height+0.5),
         id = win,
         legend = legend or '',
         image = function() return 'binary', base64(myimg:storage():string()) end
      }
      repl:send({type='image', data=tbl})
   else
      return error("bad argument #1 to 'display' (should be tensor or array of tensors)")
   end
end

function util.init(rpl)
   repl = rpl
end

return util

