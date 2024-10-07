# Auto Unstage

## Motivation

https://marketplace.visualstudio.com/items?itemName=xia0hj.auto-unstage
  
There are some debug codes I don't want to commit.  
So I develop a simple vscode extension to automatically remove them from git staging area.

![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/motivation.jpg?raw=true)

## Usage

### 1. Select rows and mark them

editor context menu:  
![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/editor_context.jpg?raw=true)

or gutter context menu:  
![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/gutter_context.jpg?raw=true)

or commands:  
![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/commands.jpg?raw=true)

### 2. Click staging buttons

Notes: run command `git add .` will not trigger, only support staging buttons.

![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/stage_all.jpg?raw=true)
![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/stage_changes.jpg?raw=true)

### 3. Manage marked rows in tree view

![](https://github.com/xia0hj/vscode-auto-unstage/blob/main/doc/tree_view.jpg?raw=true)

