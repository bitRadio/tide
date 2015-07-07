--[============================================================================[
   REPL: A REPL for Lua (with support for Torch objects).

   Copyright: MIT / BSD / Do whatever you want with it.
   Clement Farabet, 2013
--]============================================================================]

local colors = require "./lua/mcolors"

local f = {}

for name in pairs(colors) do
   f[name] = function(txt)
      return colors[name] .. txt .. colors.none
   end
end

return f
