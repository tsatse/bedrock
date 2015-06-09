Composable project scaffolder.
It generates project files from a sequence of actions described in a javascript object.

### Usage :

    var scaffolder = require('scaffolder');

    scaffolder(<Array of actions>);

The first action receives an empty parameter object as argument. It can add properties to it and perform tasks. Then it passes that parameter object along to the subsequent action which will be able to use properties and/or add more or modify them and so on.

An action can be one of :

**prompt**

    {
        actionType: 'prompt',
        ...<prompt options>...
    }

prompts a question to the user and stores the answer in the parameter object.
*prompt options* are directly taken from [cli-prompt package's multi() method](https://github.com/carlos8f/node-cli-prompt#multiple-questions).


**function**

    {
        actionType: 'function',
        func: function(parameterObject) {
            ...
            return parameterObject;
        }
    }

Performs the function given under the *func* property with the parameter object. It may modify the parameter object then must return it.

**data**

    {
        actionType: 'data',
        <list of properties>
    }

Updates the parameter object with a list of properties.

**transform**

    {
        actionType: 'transform',
        transformations: <transformations>
    }

Uses files located at *templateDirectory* to perform file copy, templating and other file operations and store the result in *destinationDirectory*. See below for more details on the *transformations* object.
This action relies on properties that are set in the incoming parameter object :

**templateDirectory** (required)

This is where sits the template tree.

**destinationDirectory** (required)

This is where to generate the files.

**gitInit** (optional)

Set this to true if you want to execute *git init*, *git add .* and *git commit -m "first commit"* after the generation.

**npmInstall** (optional)

Set this to true if you want to execute npm install after the generation (and after git commands).

**npmLink** (optional)

Set this to true if you want to run *npm link* after rendering the template

**addRemote** (optional)

This is an array of remote to add to the git repository (requires the *gitInit* option to be set).

A remote item is as follows :

    {
        name: 'name-of-the-remote',
        host: 'remote-host',
        path: 'path-on-the-remote-host'
    }

Such a remote will lead to run the following command :

    git remote add name-of-the-remote remote-host/path-on-the-remote-host

Now here is an example for the *transformations* object :

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


### licence

MIT
