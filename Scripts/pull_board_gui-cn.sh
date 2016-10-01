#!/bin/sh

eval `ssh-agent -s`
ssh-add /home/ubuntu/.ssh/id_board-cn

cd /home/ubuntu/cadance/eip
git pull
rsync -a --delete-after  /home/ubuntu/cadance/eip/Board/GUI/ /var/www/board/
rsync -a --delete-after  /home/ubuntu/cadance/eip/Board/Backend/ /var/www/backend/

forever stop 0
forever start /var/www/backend/app.js

