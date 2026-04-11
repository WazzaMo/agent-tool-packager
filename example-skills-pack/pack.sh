#!/bin/bash

## A script that uses ATP to create a package from this example dir structure.

atp create package skeleton

atp package name "Example skills pack"
atp package developer "Warwick Molloy"
atp package license "Apache 2.0"
atp package version 0.1.0
atp package copyright "Warwick Molloy 2026"

atp package newpart skill
atp package part 1 usage "Writing markdown documents" 
atp package part 1 bundle add doc-writing --skip-exec

atp package summary
atp catalog add package