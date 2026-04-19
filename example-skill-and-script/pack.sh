#!/bin/bash

## A script that uses ATP to create a package from this example dir structure.

atp create package skeleton

atp package name "Ex mermaid markdown"
atp package developer "Warwick Molloy"
atp package license "Apache 2.0"
atp package version 0.1.0
atp package copyright "Warwick Molloy 2026"

atp package newpart skill
atp package part 1 usage "render markdown images" 
atp package part 1 bundle add mermaid --exec-filter mermaid/script/run-mermaid.sh

atp package summary
#atp catalog add package