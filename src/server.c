//   ----------------------------------------------------------------------
//   tide: An online Lua/Torch7 REPL.
//   Copyright: MIT, Ali Sabri Sanal, 2015
//
//   Based on Civetweb Examples (Copyright (c) 2013-2015 the Civetweb developers)
//   -----------------------------------------------------------------------

#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include <pthread.h>
#include <sys/wait.h>
#include <signal.h>

#include "jsmn.h"
#include "civetweb.h"

#define DOCUMENT_ROOT "./web"
#define EXIT_URI "/exit"
#define KILL_URI "/kill"
#define TTL 1
#define ID_LEN 32
#define SECRET "test"

volatile int exitNow = 0;
int replpid=-1;
char cport[7];
char rport[7];
bool ssl = false; 
char ssl_dir[256];

int clean_session_id(void)
{
    FILE* fptr = fopen("sessionid.txt", "w");
    fclose(fptr);
    return 0;
}

int read_session_id(char* buf)
{
    FILE* fptr = fopen("sessionid.txt", "r");
    buf[0] = '\0';

    if (!fptr)
        return 1;

    fgets(buf, ID_LEN+1, fptr);
    fclose(fptr);
    return 0;
}
char* read_config_file(char* path)
{
    FILE* fptr = fopen(path, "r");
    long lSize;
    char* buff;

    if (!fptr) {
        printf("could not find configuration file '.luarc.lua' in HOME directory\n");
        exit(1);
    }

    fseek(fptr, 0L, SEEK_END);
    lSize = ftell(fptr);
    rewind(fptr);

    buff = calloc(1, lSize+1);
    if (!buff) {
        fclose(fptr);
        printf("memory alloc fails\n");
        exit(1);
    }

    if (fread(buff, lSize, 1, fptr) != 1) {
        fclose(fptr);
        free(buff);
        printf("file read error\n");
        exit(1);
    }
    fclose(fptr);
    return buff;
}

static void get_qsvar(const struct mg_request_info *request_info,
                      const char *name, char *dst, size_t dst_len)
{
    const char *qs = request_info->query_string;
    mg_get_var(qs, strlen(qs == NULL ? "" : qs), name, dst, dst_len);
}

int get_hostname(struct mg_connection* conn, char* host, size_t hostlen)
{
    const char *host_header;
    host[0] = 0;
    host_header = mg_get_header(conn, "Host");
    if (host_header != NULL) {
        char *pos;
        strncpy(host, host_header, hostlen);
        host[hostlen - 1] = '\0';
        pos = strchr(host, ':');
        if (pos != NULL) {
            *pos = '\0';
        }
        return 0;
    }
    return 1;
}

int session_error(struct mg_connection *conn)
{
    mg_printf(conn, "HTTP/1.1 503 Service Unavailable\r\nContent-Type: text/plain\r\n\r\n");
    mg_printf(conn, "Only one session can be opened!\n");
    return 1;
}

int exitHandler(struct mg_connection *conn, void *cbdata)
{
    mg_printf(conn, "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n");
    mg_printf(conn, "Bye!\n");
    exitNow = 1;
    return 1;
}

void sigabrt_handler(int signum)
{
    printf("Received signal %d\n", signum);
    exit(0);
}

static int repl_begin_handler(struct mg_connection *conn)
{
    char sid[ID_LEN+1];
    char buf[ID_LEN+1];
    const struct mg_request_info *request_info = mg_get_request_info(conn);

    if (!strcmp(request_info->uri, "/wsserver.lua")) {
        read_session_id(buf);
        get_qsvar(request_info, "sessionid", sid, sizeof(sid));

        if (!strlen(buf) || (strlen(buf) && !strcmp(buf, sid)))
            return 0;
        return session_error(conn);
    }
    return 0;
}

void replfunction()
{
    const char * options[] = { "document_root", DOCUMENT_ROOT,
                               "ssl_certificate", ssl_dir,
                               "listening_ports", rport,
                               "enable_directory_listing", "no",
                               "request_timeout_ms", "0", 
                               "num_threads", "10",
                               "url_rewrite_patterns", "**.lua$=./lua/wsserver.lua",
                               "error_log_file", "error.log",
                               NULL
                             };
    struct mg_callbacks callbacks;
    struct mg_context *ctx;
    
    signal(SIGABRT, sigabrt_handler);

    memset(&callbacks, 0, sizeof(callbacks));
    callbacks.begin_request = repl_begin_handler;

    ctx = mg_start(&callbacks, 0, options);

    while (!exitNow)
        sleep(1);
    mg_stop(ctx);
    printf("exiting child\n");
    exit(0);
}

void cleanup(int signal) 
{
    int status;
    pid_t wpid;
    clean_session_id();
    do {
        wpid = waitpid((pid_t)(-1), &status, WUNTRACED | WCONTINUED);
        if (wpid == -1) {
            perror("waitpid");
            exit(EXIT_FAILURE);
        }

    } while (!WIFEXITED(status) && !WIFSIGNALED(status));
}

int killHandler(struct mg_connection *conn, void *cbdata)
{
    if (replpid>0) {
        kill(replpid, SIGABRT);
        cleanup(SIGKILL);
        replpid = -1;
        if (!(replpid=fork())) {
            replfunction();
        } else {
            mg_printf(conn, "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n");
            mg_printf(conn, "Killed!\n");
        }
    }
    return 1;
}

static int redirect_to_repl(struct mg_connection *conn, const char* sid)
{
    char host[1025];
    char* scheme = ssl ? "https" : "http";

    get_hostname(conn, host, sizeof(host));
    if (strlen(host)) {
        mg_printf(conn, "HTTP/1.1 302 Found\r\n"
                    "Location: %s://%s:%d/\r\n\r\n", scheme, host, atoi(rport));
    }
    else 
        mg_printf(conn, "%s", "HTTP/1.1 500 Error\r\n\r\nHost: header is not set");
    return 1;
}

static int main_begin_handler(struct mg_connection *conn)
{
    char sid[ID_LEN+1];
    char buf[ID_LEN+1];
    const struct mg_request_info *request_info = mg_get_request_info(conn);

    read_session_id(buf);
    get_qsvar(request_info, "sessionid", sid, sizeof(sid));

    if (!strlen(buf) || strlen(buf) && !strcmp(buf, sid)) {

        if (!strcmp(request_info->uri, "/") || 
            !strcmp(request_info->uri, "/index.html"))
            return redirect_to_repl(conn, sid);
        else {
            if (strlen(buf) && 
                (!strcmp(request_info->uri, "/exit") || !strcmp(request_info->uri, "/kill")))
                return 0;
        }
    }
    return session_error(conn);
}

void mainfunction()
{
    const char * options[] = { "document_root", DOCUMENT_ROOT,
                               "ssl_certificate", ssl_dir,
                               "enable_directory_listing", "no",
                               "listening_ports", cport,
                               "error_log_file", "error.log",
                               "num_threads", "4",
                               NULL
                             };

    struct mg_callbacks callbacks;
    struct mg_context *ctx;

    memset(&callbacks, 0, sizeof(callbacks));
    callbacks.begin_request = main_begin_handler;
    ctx = mg_start(&callbacks, 0, options);
    if (ctx == NULL) {
        printf("%s\n", "Cannot start server, fatal exit");
        exit(EXIT_FAILURE);
    }
    mg_set_request_handler(ctx, EXIT_URI, exitHandler,0);
    mg_set_request_handler(ctx, KILL_URI, killHandler,0);

    printf("Start tide at %s://localhost:%d\n", ssl ? "https:" : "http", atoi(cport));

    while (!exitNow)
        sleep(1);

    mg_stop(ctx);
    printf("Bye!\n");
    kill(replpid, SIGKILL);    
    cleanup(SIGKILL);
    exit(0);
}

static int jsoneq(const char *json, jsmntok_t *tok, const char *s) 
{
    if ((int) strlen(s) == tok->end - tok->start &&
            strncmp(json + tok->start, s, tok->end - tok->start) == 0) {
        return 0;
    }
    return -1;
}

int main(int argc, char *argv[])
{
    char buf[256];
    char config_path[256]; 
    int r, i;

    strcpy(cport, "8080");
    strcpy(cport, "8081");

    srand((unsigned) time(0));
    clean_session_id();
    char* homedir = getenv("HOME");
    if (homedir == NULL) {
        printf("Error: Could not find user Home dir");
        exit(0);
    }
    sprintf(config_path, "%s/.luarc.lua", homedir);
    char* cnf = read_config_file(config_path);
    for (i=0; i<strlen(cnf); i++)
        if (cnf[i]=='=')
            cnf[i] = ':';

    int flg=0;

    jsmn_parser p;
    jsmntok_t t[128]; /* We expect no more than 128 tokens */

    jsmn_init(&p);

    r = jsmn_parse(&p, cnf, strlen(cnf), t, sizeof(t)/sizeof(t[0]));
    if (r < 0) {
        printf("Failed to parse JSON: %d\n", r);
        return 1;
    }

    for (i = 1; i < r; i++) {
        if (jsoneq(cnf, &t[i], "control_port") == 0) {
            strncpy(cport, cnf+t[i+1].start, t[i+1].end-t[i+1].start);
            cport[t[i+1].end-t[i+1].start] = '\0';
            i++;
        } else if (jsoneq(cnf, &t[i], "repl_port") == 0) {
            strncpy(rport, cnf+t[i+1].start, t[i+1].end-t[i+1].start);
            rport[t[i+1].end-t[i+1].start] = '\0';
            i++;
        } else if (jsoneq(cnf, &t[i], "ssl") == 0) {
            strncpy(buf, cnf+t[i+1].start, t[i+1].end-t[i+1].start);
            buf[t[i+1].end-t[i+1].start] = '\0';
            i++;
        }else if (jsoneq(cnf, &t[i], "ssl_dir") == 0) {
            strncpy(ssl_dir, cnf+t[i+1].start, t[i+1].end-t[i+1].start);
            ssl_dir[t[i+1].end-t[i+1].start] = '\0';
            i++;
        }
    }

    printf("cport:%s\n", cport);
    printf("rport:%s\n", rport);
    printf("buf:%s\n", buf);
    printf("ssl_dir:%s\n", ssl_dir);

    if (!strcmp(buf, "true")) {
        ssl = true;
        strcat(cport, "s");
        strcat(rport, "s");
    }

    free(cnf);

    if (flg) {
        printf("missing or wrong configuration parameters (control_port, repl_port)\n");
        exit(1);
    }

    if (!(replpid=fork())) {
        replfunction();
    }

    srand(time(NULL));
    mainfunction(replpid);
    
}

