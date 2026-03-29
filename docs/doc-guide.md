# Doc Guide

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

## Format

Markdown is a text file format that should be as readable as a text file
and only made "nicer" to read when rendered as HTML or other manner.

# Principles

1. Use heading levels 1 to 4 (#) to (####) and use level 1 for new sections,
   not only the title, so the title introduces a new section and should
   have a level 1 heading.
   Vertical space is needed around headings for clarity, meaning empty carriage
   return before and after headings.

2. Space out the file around headings and between paragraphs so that
   the file does not get cluttered. Place an empty line after a heading.

3. Use Mermaid for images where they add value

4. Use headings instead of **highlight**.

5. Try to format the table so it looks clear in the markdown text file.

6. Tables communicate better when a category or label is being described when the row is shorter than 60 chars.
    For long rows, use the next level 3 or heading (### or ####) with long-form text, one or more
    paragraphs below the heading, which allows for more items to be added.

7. Space out bulleted or numbered lists, so they are easier to read.

# Table example

| Category | Description          |
|----------|----------------------|
| Note 1   | make it easy to read |

When it comes to markdown tables, align the vertical bars and set the table
width to be consistent for each row. When a cell is too long, find a way
to continue that long-form text outside the table, afterwards.

| Category   | Description                                  |
|------------|--------------------------------------------- |
| Long Note  | ~ 10 char on why and then refer to (1) below |
| Short Note | make it easy to read                         |

(1) Long note discussion continues. Now the table is easy to read even
just in the text file, without needing to render it. It's beautiful!

# Long Form text

Using a level 4 heading gives more room for lengthier answers.


... is better than

# Labelled line

List of labelled infos:

1. **Note1:** Not easy to read as a text file.

# Purposeful Markdown

## Notes

Notes can have one of the following kinds...

{kind} in the convention below refers to one of these.

1. plan - ideas, concerns and risks for implementing a feature, epic or a user story.
2. coding - a summary of what code changes were recently made.
3. bug - a bug that was found that needs to be addressed, the root cause and acceptance criteria
4. todo - a deferred thought or path for exploration
5. concern - a question that explores a possible limitation and may result in a plan or coding change.
6. test - unit or integration tests that were added with a summary of coverage and pass rate.
7. other - when nothing else fits


Notes are held in the `docs/notes` directory and follow this document guide for formatting.
A note should be prefixed with the date in YYYY-MM-DD format, the kind (above) and have
a meaningful name indicating the essential topic of the note.

This means that notes should follow the naming convention docs/notes/{YYYY-MM-DD}-{kind}-{meaningful-short-name}.md

This way notes will be more unique and easy to understand when they were
produced in the planning and development cycle.


## Release Notes

Release notes are held in `docs/release-notes` and follow the formatting rules in this document
guide. Their naming convention is {semver}-Release-{date}.md where "semver" means semantic versioning
with Major.Minor.Revision numbers and date is in YYYY-MM-DD format.

Describe what new features was added in the commits that resulted in this release.

Release notes can collect information from a sequence of notes (docs/notes) where there are
notes of kinds in a series:
1. [todo] -> [plan] -> coding -> test to flag
  - what work was completed, where [x] was an optional kind step; and
2. bug -> test
  - to collect information about bugs found and fixed.


## Features

For product-led engineering, features can be described and documented
in a way to focus on consistent definitions with use cases
and acceptance criteria that gives intent around user impact.

They will be found in `docs/features`.

When documentation lists **package** or **part** types, use the same canonical set as
[Feature 2 — Package developer support](./features/2-package-developer-support.md):
Rule, Prompt, Skill, Hook, Mcp, Command, and Experimental (plus the Multi root type for
multi-part packages in Feature 4). Keep those lists aligned when adding or renaming types.

## Epics and Stories

User stories may be created in the project when breaking down
features into smaller, buildable components.

These are to be written into `docs/stories/`

Write requirements to docs/stories/{epic|story}-{feature-name}-{component}-{description}.md

Stories should be used to take the intention written in a feature
and turn it into a set of epics and stories that should be used
as the context to engineer a single component of the whole feature,
which is part of the final system.

## Bugs

Some sub agents are directed to find bugs during unit and integration
testing and work to validate that the bugs are repeatable.

When bugs are found, write it up in a bugs note (see kind above) docs/notes/{YYYY-MM-DD-id}-bug-{short-description}.md

It should cover:

  1.  symptoms of failure - what went wrong? what definition says this is wrong?
  2.  can it be repeated from command line execution?
  3.  can independent tests be added that find the same problem?
  