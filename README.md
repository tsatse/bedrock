generates project files from a template file tree and a description of all the transformations to apply on it

usage :

    var scaffolder = require('scaffolder');

    scaffolder(
        templateInputData,
        transformations,
        templateDirectory,
        destinationDirectory);

**template input data**

hash that contains data that should be available when rendering templates

**transformations**

a description of the transformations to apply to the template tree.

example :

    {
        filename: {
            ':transformation': <transformation-data>,
            ':transformation': <transformation-data>
        },
        foldername: {
            ':transformation': <transformation-data>,
            child-element: {
                ':transformation': <transformation-data>
            }
        }
    }

*:transformation* can be one of :

- *:rename*
    rename the file currently processed
    transformation data is the replacement string. it's a template that will be rendered with the template input data
- *:template*
    render the current file's content
    uses ejs to render the contents of the file in place using the template input data
- *:delete*
    delete the current file
- *:custom*
    this actions parameter is a function that returns an array of actions to perform

**templateDirectory**

where sits the template tree

**destinationDirectory**

where to generate the files
