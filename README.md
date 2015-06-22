# Tide
Tide is a lightweight online Lua REPL for LuaJIT with [Torch](http://torch.ch/) support. REPL routines are based on [Trepl](https://github.com/torch/trepl) and [Luaish](https://github.com/stevedonovan/luaish). Frontend was modified from [Repl.it](https://github.com/replit/repl.it).


## Features
* Small footprint http server [civetweb](https://github.com/bel2125/civetweb) with SSL support.
* A naïve login (optional)
* Code editor for editing scripts.
* REPL functions for loading and saving scripts into code editor.
* Features from [Luaish](https://github.com/stevedonovan/luaish) and  [Trepl](https://github.com/torch/trepl):
	* Shell command execution, feedback results to a global Lua function
	* Tab-completion
	* History
	* Pretty print (table introspection and coloring, optional)
	* Each command is profiled, timing is reported (optional)
	* Print all user globals with `who()`
	* Import a package's symbols globally with `import(package)`
	* Optional strict global namespace monitoring
	* Shortcuts can be specified in configuration file
* Torch support (can be disabled from configuration file)
* Image display (Torch tensors) in fancy [JsPanels](http://jspanel.de/)
* WebSocket based communication
* Liberal, commercial-friendly, permissive, [MIT license](http://en.wikipedia.org/wiki/MIT_License)
 
## Requirements (Server-side)
* Linux (tested in Ubuntu 14.04)
* [LuaJIT](http://luajit.org/index.html)
* [lfs](https://keplerproject.github.io/luafilesystem/index.html)
* [lua-cjson](http://www.kyne.com.au/~mark/software/lua-cjson.php)
* [lua-MessagePack](http://fperrad.github.io/lua-MessagePack)
* [luaposix](http://luaposix.github.io/luaposix)
* [lbase64](https://github.com/LuaDist/lbase64)
* [Torch-7](https://github.com/torch/torch7/wiki/Cheatsheet#installing-and-running-torch) (optional)
* [image]() (optional)
* [OpenSSL](https://www.openssl.org/)

## Client-side Libraries
* [repl.it](https://github.com/replit/repl.it)
	* [JQuery](https://jquery.com/)
	* [jq-console](https://github.com/replit/jq-console): A jQuery terminal plugin written in CoffeeScript.
	* [Ace](http://ace.c9.io/#nav=about): Code editor
	* [page.js](https://github.com/visionmedia/page.js): Tiny Express-inspired client-side router.
* [jsPanel](https://github.com/Flyer53/jsPanel): A jQuery Plugin to create highly configurable floating panels
	* [jQuery UI](https://jqueryui.com/)
* [msgpack-js-browser]() (updated according to msgpack Spec 5)

## Installing
```bash
git clone https://github.com/alisabri/tide.git
cd tide
make
```
Modify and copy configuration file `.luarc.lua` to your home directory
```bash
cp .luarc.lua ~/  
```

## Running 
In tide directory, execute
```bash
./server
```
The executable forks a child process. The main process serves static files whereas the child process creates a lua state, binds a websocket and initializes REPL. 

After executing server, in a browser, tide can be opened at `http://localhost:8080` (port number and SSL support can be specified in *server.c* source file, default is 8080)

## Configuration
Configuration options can be specified as a Lua table in *.luarc.lua* file (this file should be copied to the user's home directory)
 
```lua
{
  login = {user = "foo", password="bar"},
  torch = true,
  trepl = {globals=false, color=false, timer=false},
  images = true,
  keeplines = 500,
  shortcuts = {io="io.write(", pr="print("}
}
```
`login`: username and password will be asked when client connects.
`torch`: Torch package will be loaded.
`trepl`: Trepl package will be loaded, if defined.
`globals`: displays a warning message when a global Lua variable defined
`color`: color printing
`timer`: display the time spent for execution of a script
`images`: image (Torch tensors) display function will be loaded
`keeplines`: number of lines to save for history
`shortcuts`: list of shortcutted commands

To disable "`login`", "`trepl`" and "`shortcuts`" options, just comment out the lines. If "`torch`" option is false then "`images`" will be ignored.

## Usage
Any line begining with ‘.’ is assumed to be a shell command:

    th> .ls
    luaish.lua  lua.lua  readme.md

for details please refer to [Luaish](https://github.com/stevedonovan/luaish).

For loading/saving scprits/texts files into/from code editor use:

    th> .load filename
    th> .save filename
(Code editor can be cleared by Ctrl+A:select all and then delete)

To display a Torch tensor as an image:

    th> display(image.lena(), {id='img4', zoom=0.6, legend="test"})

For pretty printing tables use:

    th> cprint({str="12345", num=10, bool=true})
	{
	  bool : true
	  num : 10
	  str : "12345"
	}

![ ](https://github.com/bitRadio/Tide/blob/master/jpeg/out.jpg "screenshot")

## License and Disclaimer
Tide is MIT licensed.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
