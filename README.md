# Auto Unstage

## Motivation

There are some debug codes I don't want to commit.  
So I develop a simple extension to automatically remove them from git staging area.

![](./doc/motivation.jpg)

## Usage

### 1. Select rows and mark them

editor context menu:  
![](./doc/editor_context.jpg)

or gutter context menu:  
![](./doc/gutter_context.jpg)

or commands:  
![](./doc/commands.jpg)

### 2. Click staging buttons

Notes: run command `git add .` will not trigger, only support staging buttons.

![](./doc/stage_all.jpg)
![](./doc/stage_changes.jpg)

### 3. Manage marked rows in tree view

![](./doc/tree_view.jpg)

