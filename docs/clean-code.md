# Coding convention

## Why?

So contributors and Agents know what code is expected to look like in the HQ.

# Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# General Principles

Many smaller files, with meaningful names, is easier to navigate and understand
than a few, very large files.

## What does "small" file mean?

A good (small) file size should be 100 to 300 lines long.
It's easier for a human to name it well and to see the whole file this way.
Then the program is a composition of the files and the hierarchy of the project
is easier to see, overall. Of course, this should better suits the context 
window of AI agents - there's an interesting experiment there...

> **It should be light and compact so it fits in the pocket of any agent.**

# Clean Code

Where object-oriented code makes sense (does not always),
the following should be observed.

Single responsibilities for classes - do one thing well.

Open for extension, mostly by use of composition via
dependency injection, closed for adding methods.

Liskov substitutability of derived classes - any class
extending `Foo` should be an equal implementation of
`Foo` that can "foo" just as effectively as its friends,
even if it's "foos" are a bit different.

Interfaces are better than derived classes. Where your
language supports interfaces, that is the best path
for creating objects with the same protocol.

Polymorphism as a last resort and only when it really
adds readibility and keeps things simple.

# Clean Tests

## Size versus number priority

Like code it is better to have many smaller files instead
of a few large files. This makes it easier to find test failures.

This applies to both unit test files and integration tests.

## Small for tests

A suite of tests in a file of 400 lines is small.
A file of 800 lines for tests becomes harder to manage and should
be broken into two files with the describe() calls making it very clear.


