
CC=gcc
IDIR =./
LUAJIT_BASE_DIR = $(shell dirname $(shell which luajit))/..
LUAJIT_INC_DIR = $(LUAJIT_BASE_DIR)/include
LUAJIT_LIB_DIR = $(LUAJIT_BASE_DIR)/lib
CFLAGS=-I$(IDIR) -I$(LUAJIT_INC_DIR) -L$(LUAJIT_LIB_DIR)
LDFLAGS = 
DEFINES = -DLINUX -DUSE_LUA -DUSE_WEBSOCKET -DUSE_TIMERS -DUSE_SSL

LIBS = -lpthread -ldl -lluajit-5.1

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
	LIBS +=  -lrt
else
	LDFLAGS += -pagezero_size 10000 -image_base 100000000
endif

DEPS = civetweb.h md5.inl mod_lua.inl timer.inl

OBJ = server.o civetweb.o jsmn.o

%.o: %.c $(DEPS)
		$(CC) -c -o $@ $< $(CFLAGS) $(DEFINES)

server: $(OBJ)
	$(CC) -o $@ $^ $(LDFLAGS) $(CFLAGS) $(LIBS)
	cp server ../

.PHONY: clean

clean:
	rm -f *.o *~ server ../server
  
