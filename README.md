Composable project scaffolder.
It generates project files from a sequence of actions described in a javascript object.

### Installing :

    > npm install @tsatse/scaffolder --save

### Usage :

    var scaffolder = require('scaffolder');

    scaffolder(<Array of actions>);

Each action is an object containing information on what should be done.
The first action receives an empty parameter object as argument. It can add properties to it and perform tasks. Then it passes that parameter object along to the subsequent action which will be able to use properties and/or add more or modify them and so on. Some properties can be templates that will be rendered with [ejs](https://www.npmjs.com/package/ejs) and using the parameter object itself as a data source, they will bear the "can be templated" comment in the descriptions below.

Every action has a set of parameters, which may be specific to that action or more generic.

for the moment, the only available generic parameter is this :

**executeIf**

    {
        actionType: <any action>,
        executeIf: <expression>
    }

Only performs the action if the result of eval-ing *expression* is true. If you want to use a property from the parameter object in the expression, use the *input* symbol. For instance, if you want an expression that checks if the hasCss property is true from the parameter object, you would use the following expression :

    'input.hasCss'


Now here is the list of every possible actions :

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
        <list of properties> // required
    }

Updates the parameter object with a list of properties.

**copy**

    {
        actionType: 'copy',
        source: <source folder>, // can a template
        destination: <destination folder> // can a template
    }

Copy the contents of *source* to *destination*.

**transform**

    {
        actionType: 'transform',
        target: <base folder to prepend to every path if transformations is not an array> // 
        transformations: <transformations> // required
    }

Apply a set of transformations described in the *transformations* object. The *transformations* object can be either an Array or an object.
If it is an Array, every element must be of the following form :
    
    {
        target: <on which file to apply the transformation>, // can be templated
        transformation: {':<action name>': <action parameters>}
    }

It it is not an Array, it's an object that represents the file tree on which we want to apply transforms. In this case, every property represents either a file/folder or a transformation that should be applied *to its parent*. Transformations names always start with the ':' character to distinguish them from file or folder names.

Here is an example for the *transformations* object :

    {
        'a-file.ext': {
            ':rename': "replacement string to apply to a-file.ext",
        },
        foldername: {
            ':rename': "replacement string to apply to foldername",
            'another-file.ext': {
                ':delete': true // will delete the file another-file.ext
            }
        }
    }

*:transformation* can be one of :

- *:rename*
    rename the file currently processed
    transformation data is the replacement string. it's a template that will be rendered with the parameter object as input data
- *:template*
    render the current file's content
    uses ejs to render the contents of the file in place using the parameter object as input data
- *:delete*
    delete the current file (or folder)
- *:custom*
    this actions parameter is a function that returns an array of actions to perform


**git**

    {
        actionType: 'git',
        workingDir: <directory of the project> // required
    }

Initiates a git repository at the location given in *workingDir*
It will execute *git init*, *git add .* and *git commit -m "first commit"*.

**addRemote**

    {
        actionType: 'addRemote',
        workingDir: <directory of the project>, // required
        remotes: [ // at least one is required
            {
                name: <name of the remote in the git repository>,
                host: <remote host>,
                path: <path of the repository on the remote computer>
            },
            ...
        ]
    }

For every remote described in the *remotes* Array, executes the following command :

    > git remote add <name> <host>/<path>

**copyToRemotes**

    {
        actionType: 'copyToRemotes',
        workingDir: <directory of the project>, // required
        remotes: [ // required
            {
                name: <name of the remote in the git repository>,
                host: <remote host>,
                path: <path of the repository on the remote host>
            },
            ...
        ]
    }

This will upload the repository located at *workingDir* to every remote described in *remotes*. It will act as if you issued the following commands by hand :

    > cd <workingDir>/..
    > git clone --bare <project name>
    > scp -r <project name>.git <remote host>/<remote path>
    > rm -rf <project name>.git


**npmInstall**

    {
        actionType: 'npmInstall',
        destinationDirectory: <directory of the project> // required
    }

As the name implies, installs npm dependencies by issuing the following command in the working directory :

    > npm install

**npmLink**

    {
        actionType: 'npmLink',
        destinationDirectory: <directory of the project> // required
    }

As the name implies, links the npm package locally so that it becomes available by other local packages that would link to it. It runs the following command in the working directory :

    > npm link

### licence

[MIT](http://opensource.org/licenses/MIT)
