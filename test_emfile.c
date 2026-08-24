#include <fcntl.h>
#include <stdio.h>
#include <unistd.h>
#include <errno.h>

int main() {
    int i = 0;
    while(open("/dev/null", O_RDONLY) != -1) {
        i++;
    }
    printf("Limit: %d, Errno: %d\n", i, errno);
    return 0;
}
