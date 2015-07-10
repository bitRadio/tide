#Tide
Tide is a ligthweight, online Lua REPL for LuaJIT with [Torch](http://torch.ch/) support. REPL routines are based on [Trepl](https://github.com/torch/trepl) and [Luaish](https://github.com/stevedonovan/luaish). Frontend was modified from [Repl.it](https://github.com/replit/repl.it).


## Features
* Small footprint http server [civetweb](https://github.com/bel2125/civetweb) with SSL support.
* A naive login (optional)
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
 
## Requirements (Server-side)
* Linux (tested in Ubuntu 14.04)
* [LuaJIT](http://luajit.org/index.html)
* [Civetweb](https://github.com/bel2125/civetweb/blob/master/LICENSE.md): Embedded C/C++ web server
* [Torch-7](https://github.com/torch/torch7/blob/master/COPYRIGHT.txt): A scientific computing framework for LuaJIT (optional)
* [jsmn](https://bitbucket.org/zserge/jsmn/wiki/Home): A minimalistic library for JSON parsing
* [lpath](https://github.com/starwing/lpath) : Path manipulation module for Lua
* [lua-cjson](https://github.com/mpx/lua-cjson/blob/master/LICENSE): A fast JSON encoding/parsing module for Lua
* [lua-MessagePack](https://github.com/fperrad/lua-MessagePack/blob/master/COPYRIGHT): Pure Lua implementation for msgpack (spec v5)
* [image](https://github.com/torch/image): An Image toolbox for Torch
* [OpenSSL](https://www.openssl.org/)

## Client-side Libraries
* [repl.it]()
	* [JQuery](https://jquery.com/)
	* [jq-console](https://github.com/replit/jq-console): A jQuery terminal plugin written in CoffeeScript.
	* [Ace](http://ace.c9.io/#nav=about): Code editor
	* [page.js](https://github.com/visionmedia/page.js): Tiny Express-inspired client-side router.
* [jsPanel](https://github.com/Flyer53/jsPanel): A jQuery Plugin to create highly configurable floating panels
	* [jQuery UI](https://jqueryui.com/)
* [msgpack-js-browser]() (Updated according to msgpack Spec 5)

## Installing
LuaJIT and OpenSSL should be installed before compiling tide. Tide will require Lua 5.1 header files and libluajit-5.1. In case of having multiple versions of Lua installed, change LUAJIT_INC_DIR and LUAJIT_LIB_DIR paremeters in src/Makefile appropriately.
To run tide in minimum configuration (without torch support) following packages need to be installed 
```bash
sudo luarocks install lua-messagepack
sudo luarocks install lua-cjson
git clone https://github.com/starwing/lpath
cd lpath
sudo luarocks make rockspecs/lpath-scm-0.rockspec
```

To install tide:
```bash
git clone https://github.com/bitradio/tide.git
cd tide
make
```
Modify and copy configuration file *.luarc.lua* to your home directory
```bash
cp luarc.lua ~/.luarc.lua
```

##Running 
In tide directory
```bash
./server
```
The executable forks a child process. The main process listens on the *control_port* (default 8080) and redirects requests to the *repl_port* (default 8081) where the child process listens to. After serving static files, with a GET request for *http(s)://localhost:8081/wsserver.lua*, child process creates a lua state, establishes websocket connection and initializes REPL.

After executing server, in a browser, tide can be opened at *http(s)://localhost:8080* (port numbers and SSL support can be specified in *.luarc.lua* configuration file).

##Configuration
Configuration options can be specified as a Lua table in *.luarc.lua* file (this file should be copied to the user's home directory).
 
```bash
{
  control_port = 8080,
  repl_port = 8081,
  ssl = false,
  ssl_dir = "./ssl/server.pem",
  login = {user = "foo", password="bar"},
  torch = true,
  trepl = {globals=false, color=true, timer=false},
  images = false,
  keeplines = 500,
  shortcuts = {io="io.write"}
}
```
**control_port**: used to start/kill REPL process and to terminate tide server.
**repl_port**: used for REPL's websocket connection
**ssl**: if true *https* protocol will be used
**ssl_dir**: directory for certification files
**login**: username and password will be asked when client connects.
**torch**: torch package will be loaded.
**trepl**: if defined, Trepl package will be loaded
>globals: displays a warning message when a global Lua variable defined
>color: color printing
>timer: display the time spent for execution of a script

**images**: image (Torch tensors) display function will be loaded
**keeplines**: number of lines to save for history
**shortcuts**: list of shortcutted commands

To disable "login", "trepl" and "shortcuts" options, just comment out the lines. If "torch" option is false then "images" will be ignored.

##Usage
Any line begining with [.] is assumed to be a shell command:

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

To terminate tide web server :

    th> .exit


![ ](https://github.com/bitRadio/tide/blob/master/jpeg/out.jpg "screenshot")

## License and Disclaimer
Tide is MIT licensed.

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.


