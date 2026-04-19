Find a mermaid diagram embedded in a markdown file, write it out to a separate mermaid input file
with the file name image-{basename}-{description}.mmd where "basename" is the base filename from the markdown file 
and "description" is a short description of the mermaid image. Run script/run-mermaid.sh image-{basename}-{description}.mmd image-{basename}-{description}.png and then replace the mermaid text with a reference to the PNG image of the form:

```text
![{description}](./image-{basename}-{description}.png)
```

So that the markdown file refers to the rendered image.

