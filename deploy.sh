#!/bin/bash

rsync -av -e ssh --exclude={'*.sh','.git','.gitignore','*.DS_STORE','README.md'} $(pwd)/* daniel@192.254.190.199:public_html/
