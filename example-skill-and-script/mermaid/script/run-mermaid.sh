#!/usr/bin/env bash

## Assumes run-mermaid.sh <infile> <outfile>

echo $*

infile="no-input"
outfile="no-output"

echo "there are $# args"

if [ $# == "2" ]
then
    infile=$1
    outfile=$2

    if [ -f $infile ]
    then
        npx -p @mermaid-js/mermaid-cli mmdc -i ${infile} -o ${outfile}
    else
        test -f $infile || echo "Input file ${infile} is missing" > &2
    fi
else
    infile="no-input"
    outfile="no-output"
    echo "Error! Need two arguments INFILE and OUTFILE" > @2
fi
