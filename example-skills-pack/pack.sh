#!/bin/bash

## A script that uses ATP to create a package from this example dir structure.

atp create package skeleton

atp package name "Example skills pack"
atp package developer "Warwick Molloy"
atp package license "Apache 2.0"
atp package version 0.1.1
atp package copyright "Warwick Molloy 2026"

atp package newpart skill
atp package part 1 usage "Writing markdown documents" 
atp package part 1 bundle add doc-writing --skip-exec

atp package newpart skill
atp package part 2 usage "Ask the agent to write notes." 
atp package part 2 bundle add note-taking --skip-exec

atp package summary
atp catalog add package