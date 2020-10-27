
#!/usr/bin/env sh
 
# 确保脚本抛出遇到的错误
set -e
 
# 生成静态文件
vuepress build docs
 
# 进入生成的文件夹
cd docs/.vuepress/dist
 
git add -A
git commit -m 'deploy'
git push -f git@github.com:wsd000/wsd000.github.io.git main
 
cd -