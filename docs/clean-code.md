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

# Self-documenting code

## Code Composition for self-documenting code

The meaningful names in functions or classes act as a description
and this effect is even stronger when code is composed of functions
that call other functions because the names of each function gives
a descriptive break-down of the task.

There's a similar composition effect when a type or an interface
is built from other types or interfaces, allowing for the smaller
types to be re-used in code. This is also true of classes that have
other classes, known as the "have-a" relationship in object-oriented programming.

The other benefit of the above principles are that each component is smaller
and more dedicated to one purpose, making the code cleaner.
The composed functions or types are also clean because they build on top
of well-named entities, making them easier to read. They should also be short.

This means that a function longer than 50 lines should be broken into
smaller functions with meaningful names. Ideally, each function should be
as simple and as dedicated as possible.

## Descriptive comments for self-describing code.

In TypeScript the /** ... */ document comment is very useful.
You can add meaning parameters, return types and other annotations
on each class, interface and function.

# Clean Tests

## Size versus number priority

Like code it is better to have many smaller files instead
of a few large files. This makes it easier to find test failures.

This applies to both unit test files and integration tests.

## Small for tests

A suite of tests in a file of 400 lines is small.
A file of 800 lines for tests becomes harder to manage and should
be broken into two files with the describe() calls making it very clear.


