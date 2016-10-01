#!/bin/sh

eval `ssh-agent -s`
ssh-add /home/ubuntu/.ssh/id_board-da

cd /home/ubuntu/cadance/eip
git pull
rsync -a --delete-after  /home/ubuntu/cadance/eip/Board/GUI/ /var/www/board/
