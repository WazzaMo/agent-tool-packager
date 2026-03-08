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

... and...

# Long Form text

Using a level 4 heading gives more room for lengthier answers.


... is better than

# Labelled line

List of labelled infos:

1. **Note1:** Not easy to read as a text file.

# Purposeful Markdown

## Notes

Notes are held in the `docs/notes` directory and follow this document guide for formatting.
A note should be prefixed with the date in YYYY-MM-DD format and have
a meaningful name indicating the essential topic of the note.

This means that notes should follow the naming convention docs/notes/{YYYY-MM-DD}-{meaningful-short-name}.md

This way notes will be more unique and easy to understand when they were
produced in the planning and development cycle.

## Release Notes

Release notes are held in `docs/release-notes` and follow the formatting rules in this document
guide. Their naming convention is {semver}-Release-{date}.md where "semver" means semantic versioning
with Major.Minor.Revision numbers and date is in YYYY-MM-DD format.

Describe what new features was added in the commits that resulted in this release.

## Features

For product-led engineering, features can be described and documented
in a way to focus on consistent definitions with use cases
and acceptance criteria that gives intent around user impact.

They will be found in `docs/features`

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

When bugs are found, write it up in docs/bugs/{YYYY-MM-DD-id}-{short-description}.md

It should cover:

  1.  symptoms of failure - what went wrong? what definition says this is wrong?
  2.  can it be repeated from command line execution?
  3.  can independent tests be added that find the same problem?
  