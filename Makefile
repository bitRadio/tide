
all :	
		$(MAKE) -C src

clean :	
		rm -f server
		$(MAKE) -C src clean
