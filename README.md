generates project files from a template file tree and a description of all the transformations to apply on it

### usage :

    var scaffolder = require('scaffolder');

    scaffolder(
        templateInputData,
        transformations,
        templateDirectory,
        destinationDirectory);

*options* contains the following fields :

**templateInputData** (required)

hash that contains data that should be available when rendering templates

**transformations** (required)

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
    delete the current file (or folder)
- *:custom*
    this actions parameter is a function that returns an array of actions to perform

**templateDirectory** (required)

where sits the template tree

**destinationDirectory** (required)

where to generate the files

**gitInit** (optional)

set to true if you want to execute 'git init', 'git add .' and 'git commit -m "first commit"' after the generation

**npmInstall** (optional)

set to true if you want to execute npm install after the generation (and after git commands)

**npmLink** (optional)

run npm link after rendering the template

**addRemote** (optional)

an array containing information to add remotes to the git repository (requires the gitInit option to be set).

remote information is as follows :

    {
        name: 'name-of-the-remote',
        host: 'remote-host',
        path: 'path-on-the-remote-host'
    }

and it will run the following command :

    git remote add name-of-the-remote remote-host/path-on-the-remote-host

### licence

MIT
