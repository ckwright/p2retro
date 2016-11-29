# Fun Retro
P2's protoype of an easy to use use and beautiful restrospective board based on the work of [funretrospectives(https://github.com/funretro/distributed)

## User interface

![Fun retro screenshot](http://i.imgur.com/MWdxH5l.png)

## How to setup local environment

1. Clone the repository
2. Install [Node.js](https://nodejs.org/en/)
3. Run ```npm install``` (inside the project folder)
4. Run ```gulp```
5. Fun Retro is using [Firebase](http://www.firebase.com). First create an account at firebase. Then create a test app.
6. Change the Database rules of created app:
```
{
    "rules": {
        ".read": true,
        ".write": true
    }
}
```
7. After creating the app you can save the new url (ex: https://funretrotest.firebaseio.com/) and replace the variable ```firebaseUrl``` inside ```js/firebaseService.js```
8. Now you can open the app on [http://localhost:4000/](http://localhost:4000/) and start creating your boards.
   You will notice that the app has this architecture on firebase:
![Fun retro architecture](https://i.imgur.com/etYgDia.png)

## Contribute to Fun Retro

* All things being developed are managed with Github issues.
* We are currently using labels for [Bug](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3Abug) and [Priority](https://github.com/funretro/distributed/issues?q=is%3Aissue+is%3Aopen+label%3Apriority).
   * Please fell free to get any one of those two.
   * Create as many pull requests you want.
* We also have user recommendations for new features and voting happening at [Uservoice](https://funretrospectives.uservoice.com/forums/269818-general)

## Running the application

1. Install [Node.js](https://nodejs.org/en/)
2. Run ```npm install``` (inside the project folder)
3. Run ```gulp```
4. Point your browser to [http://localhost:4000/](http://localhost:4000/) or open dist/index.html

## Continuous Integration

Our tests run on SnapCI [SnapCI](https://snap-ci.com/funretro/distributed/branch/master)

## Running the tests

1. Run ```gulp test```
2. Refactor and watch tests re-run.
3. Fix any red tests
4. Note: you can open http://localhost:9876/debug.html to run tests with a browser
