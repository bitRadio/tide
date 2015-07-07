
CC=gcc
IDIR =./
LUAJIT_INC_DIR = /usr/local
CFLAGS=-I$(IDIR) -I$(LUAJIT_INC_DIR)
DEFINES = -DLINUX -DUSE_LUA -DUSE_WEBSOCKET -DUSE_TIMERS -DUSE_SSL

LIBS = -lpthread -ldl -lluajit-5.1 -lrt

DEPS = civetweb.h md5.inl mod_lua.inl timer.inl

OBJ = server.o civetweb.o jsmn.o

%.o: %.c $(DEPS)
		$(CC) -c -o $@ $< $(CFLAGS) $(DEFINES)

server: $(OBJ)
	gcc -o $@ $^ $(CFLAGS) $(LIBS)
	cp server ../

.PHONY: clean

clean:
	rm -f *.o *~ server ../server
  