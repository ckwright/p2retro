angular.module('fireideaz', ['firebase',
               'ngDialog',
               'lvl.directives.dragdrop',
               'ngSanitize',
               'ngAria']);

'use strict';

angular
  .module('fireideaz')
  .service('Auth', function () {
    var mainRef = new Firebase('https://blinding-torch-6662.firebaseio.com');

    function logUser(user, callback) {
      mainRef.unauth();
      mainRef.authWithPassword({
        email    : user + '@fireideaz.com',
        password : user
      }, function(error, authData) {
        if (error) {
          console.log('Log user failed: ', error);
          window.location.hash = '';
          location.reload();
        } else {
          callback(authData);
        }
      });
    }

    function createUserAndLog(newUser, callback) {
      mainRef.createUser({
        email    : newUser + '@fireideaz.com',
        password : newUser
      }, function(error) {
        if (error) {
          console.log('Create user failed: ', error);
        } else {
          logUser(newUser, callback);
        }
      });
    }
    return {
      createUserAndLog: createUserAndLog,
      logUser: logUser
    };
  });

'use strict';

angular
.module('fireideaz')
.directive('enterClick', function () {
  return {
    restrict: 'A',
    link: function (scope, elem) {
      elem.bind('keydown', function(event) {
        if (event.keyCode === 13 && event.shiftKey) {
          event.preventDefault();
          $(elem[0]).find('button').focus();
          $(elem[0]).find('button').click();
        }
      });
    }
  };
});

'use strict';

angular
  .module('fireideaz')
  .service('FirebaseService', ['$firebaseArray', function ($firebaseArray) {
    var firebaseUrl = 'https://p2retro-29c20.firebaseio.com/';

    function newFirebaseArray(messagesRef) {
      return $firebaseArray(messagesRef);
    }

    function getServerTimestamp() {
      return Firebase.ServerValue.TIMESTAMP;
    }

    function getMessagesRef(userId) {
      return new Firebase(firebaseUrl + '/messages/' + userId);
    }

    function getMessageRef(userId, messageId) {
      return new Firebase(firebaseUrl + '/messages/' + userId + '/' + messageId);
    }

    function getBoardRef(userId) {
      return new Firebase(firebaseUrl + '/boards/' + userId);
    }

    function getBoardColumns(userId) {
      return new Firebase(firebaseUrl + '/boards/' + userId + '/columns');
    }

    return {
      newFirebaseArray: newFirebaseArray,
      getServerTimestamp: getServerTimestamp,
      getMessagesRef: getMessagesRef,
      getMessageRef: getMessageRef,
      getBoardRef: getBoardRef,
      getBoardColumns: getBoardColumns
    };
  }]);

'use strict';

angular
  .module('fireideaz')
  .controller('MainCtrl', ['$scope', '$filter',
    '$window', 'Utils', 'Auth', '$rootScope', 'FirebaseService', 'ModalService',
    function($scope, $filter, $window, utils, auth, $rootScope, firebaseService, modalService) {
      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = {
        name: ''
      };
      $scope.userId = $window.location.hash.substring(1) || '';
      $scope.sortField = '$id';
      $scope.selectedType = 1;

      $scope.closeAllModals = function(){
        modalService.closeAll();
      };

      function getBoardAndMessages(userData) {
        $scope.userId = $window.location.hash.substring(1) || '499sm';

        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        var board = firebaseService.getBoardRef($scope.userId);

        board.on('value', function(board) {
          $scope.board = board.val();
          $scope.boardId = $rootScope.boardId = board.val().boardId;
          $scope.boardContext = $rootScope.boardContext = board.val().boardContext;
        });

        $scope.boardRef = board;
        $scope.userUid = userData.uid;
        $scope.messages = firebaseService.newFirebaseArray(messagesRef);
        $scope.loading = false;
      }

      if ($scope.userId !== '') {
        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        auth.logUser($scope.userId, getBoardAndMessages);
      } else {
        $scope.loading = false;
      }

      $scope.isColumnSelected = function(type) {
        return parseInt($scope.selectedType) === parseInt(type);
      };

      $scope.seeNotification = function() {
        localStorage.setItem('funretro1', true);
      };

      $scope.showNotification = function() {
        return !localStorage.getItem('funretro1') && $scope.userId !== '';
      };

      $scope.getSortOrder = function() {
        return $scope.sortField === 'votes' ? true : false;
      };

      $scope.toggleVote = function(key, votes) {
        if (!localStorage.getItem(key)) {
          messagesRef.child(key).update({
            votes: votes + 1,
            date: firebaseService.getServerTimestamp()
          });

          localStorage.setItem(key, 1);
        } else {
          messagesRef.child(key).update({
            votes: votes - 1,
            date: firebaseService.getServerTimestamp()
          });

          localStorage.removeItem(key);
        }
      };

      function redirectToBoard() {
        window.location.href = window.location.origin +
          window.location.pathname + '#' + $scope.userId;
      }

      $scope.createNewBoard = function() {
        $scope.loading = true;
        modalService.closeAll();
        $scope.userId = utils.createUserId();

        var callback = function(userData) {
          var board = firebaseService.getBoardRef($scope.userId);
          board.set({
            boardId: $scope.newBoard.name,
            date_created: new Date().toString(),
            columns: $scope.messageTypes,
            user_id: userData.uid
          });

          redirectToBoard();

          $scope.newBoard.name = '';
        };

        auth.createUserAndLog($scope.userId, callback);
      };

      $scope.changeBoardContext = function() {
        $scope.boardRef.update({
          boardContext: $scope.boardContext
        });
      };

      $scope.addNewColumn = function(name) {
        $scope.board.columns.push({
          value: name,
          id: utils.getNextId($scope.board)
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        $scope.board.columns[id - 1] = {
          value: newName,
          id: id
        };

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.deleteColumn = function(column) {
        $scope.board.columns = $scope.board.columns.filter(function(_column) {
            return _column.id !== column.id;
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));
        modalService.closeAll();
      };

      $scope.deleteMessage = function(message) {
        $scope.messages.$remove(message);
        modalService.closeAll();
      };

      function addMessageCallback(message) {
        var id = message.key();
        angular.element($('#' + id)).scope().isEditing = true;
        $('#' + id).find('textarea').focus();
      }

      $scope.addNewMessage = function(type) {
        $scope.messages.$add({
          text: '',
          user_id: $scope.userUid,
          type: {
            id: type.id
          },
          date: firebaseService.getServerTimestamp(),
          votes: 0
        }).then(addMessageCallback);
      };

      $scope.deleteCards = function() {
        $($scope.messages).each(function(index, message) {
          $scope.messages.$remove(message);
        });

        modalService.closeAll();
      };

      $scope.getBoardText = function() {
        if ($scope.board) {
          var clipboard = '';

          $($scope.board.columns).each(function(index, column) {
            if (index === 0) {
              clipboard += '<strong>' + column.value + '</strong><br />';
            } else {
              clipboard += '<br /><strong>' + column.value + '</strong><br />';
            }
            var filteredArray = $filter('orderBy')($scope.messages,
              $scope.sortField,
              $scope.getSortOrder());

            $(filteredArray).each(function(index2, message) {
              if (message.type.id === column.id) {
                clipboard += '- ' + message.text + ' (' + message.votes + ' votes) <br />';
              }
            });
          });

          return clipboard;
        } else return '';
      };

      angular.element($window).bind('hashchange', function() {
        $scope.loading = true;
        $scope.userId = $window.location.hash.substring(1) || '';
        auth.logUser($scope.userId, getBoardAndMessages);
      });
    }
  ]);

'use strict';

angular
  .module('fireideaz')
  .controller('MessageCtrl', ['$scope', '$filter',
              '$window', 'Auth', '$rootScope', 'FirebaseService', 'ModalService',
    function($scope, $filter, $window, auth, $rootScope, firebaseService, modalService) {
      $scope.modalService = modalService;
      $scope.userId = $window.location.hash.substring(1);

      $scope.droppedEvent = function(dragEl, dropEl) {
        if(dragEl !== dropEl) {
          $scope.dragEl = dragEl;
          $scope.dropEl = dropEl;

          modalService.openMergeCards($scope);
        }
      };

      $scope.dropped = function(dragEl, dropEl) {
        var drag = $('#' + dragEl);
        var drop = $('#' + dropEl);

        var dropMessageRef = firebaseService.getMessageRef($scope.userId, drop.attr('messageId'));
        var dragMessageRef = firebaseService.getMessageRef($scope.userId, drag.attr('messageId'));

        dropMessageRef.once('value', function(dropMessage) {
          dragMessageRef.once('value', function(dragMessage) {
            dropMessageRef.update({
              text: dropMessage.val().text + ' | ' + dragMessage.val().text,
              votes: dropMessage.val().votes + dragMessage.val().votes
            });

            dragMessageRef.remove();
            modalService.closeAll();
          });
        });
      };
    }]
  );

'use strict';

angular
  .module('fireideaz')
  .service('Utils', [function () {
    function createUserId() {
      var text = '';
      var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

      for( var i=0; i < 5; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return text;
    }

    function alreadyVoted(key) {
      return localStorage.getItem(key);
    }

    function focusElement(id) {
      $('#' + id).find('textarea').focus();
    }

    var messageTypes = [{
      id: 1,
      value: 'Went well'
    }, {
      id: 2,
      value: 'To improve'
    }, {
      id: 3,
      value: 'Action items'
    }];

    function getNextId(board) {
      return board.columns.slice(-1).pop().id + 1;
    }

    function toObject(array) {
      var object = {};

      for (var i = 0; i < array.length; i++) {
        object[i] = {
          id: array[i].id,
          value: array[i].value
        };
      }

      return object;
    }

    function columnClass(id) {
      return "column_" + (id % 6 || 6);
    }

    return {
      createUserId: createUserId,
      alreadyVoted: alreadyVoted,
      focusElement: focusElement,
      messageTypes: messageTypes,
      getNextId: getNextId,
      toObject: toObject,
      columnClass: columnClass
    };
  }]);

'use strict';

angular.module('fireideaz').directive('boardContext', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/boardContext.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('dialogs', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/dialogs.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('pageFooter', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/footer.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('pageHeader', ['ModalService', function(modalService) {
    return {
      templateUrl : 'components/header.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainContent', [function() {
    return {
      templateUrl : 'components/mainContent.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainPage', ['ModalService', function(modalService) {
    return {
      restrict: 'E',
      templateUrl : 'components/mainPage.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('menu', [function() {
    return {
      templateUrl : 'components/menu.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('newFeatureNotification', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/newFeatureNotification.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('spinner', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/spinner.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('userVoice', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/userVoice.html'
    };
  }]
);

'use strict';

angular
  .module('fireideaz')
  .service('ModalService', ['ngDialog', function(ngDialog) {
    return {
      openAddNewColumn: function(scope) {
        ngDialog.open({
          template: 'addNewColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openAddNewBoard: function(scope) {
        ngDialog.open({
          template: 'addNewBoard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteCard: function(scope) {
        ngDialog.open({
          template: 'deleteCard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteColumn: function(scope) {
        ngDialog.open({
          template: 'deleteColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },

      openMergeCards: function(scope) {
        ngDialog.open({
          template: 'mergeCards',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openCopyBoard: function(scope) {
        ngDialog.open({
          template: 'copyBoard',
          className: 'ngdialog-theme-plain bigDialog',
          scope: scope
        });
      },
      openDeleteCards: function(scope) {
        ngDialog.open({
          template: 'deleteCards',
          className: 'ngdialog-theme-plain danger',
          scope: scope
        });
      },
      closeAll: function() {
        ngDialog.closeAll();
      }
    };
  }]);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImF1dGguanMiLCJlbnRlckNsaWNrLmpzIiwiZmlyZWJhc2VTZXJ2aWNlLmpzIiwibWFpbkNvbnRyb2xsZXIuanMiLCJtZXNzYWdlQ29udHJvbGxlci5qcyIsInV0aWxzLmpzIiwiZGlyZWN0aXZlcy9ib2FyZENvbnRleHQuanMiLCJkaXJlY3RpdmVzL2RpYWxvZ3MuanMiLCJkaXJlY3RpdmVzL2Zvb3Rlci5qcyIsImRpcmVjdGl2ZXMvaGVhZGVyLmpzIiwiZGlyZWN0aXZlcy9tYWluQ29udGVudC5qcyIsImRpcmVjdGl2ZXMvbWFpblBhZ2UuanMiLCJkaXJlY3RpdmVzL21lbnUuanMiLCJkaXJlY3RpdmVzL25ld0ZlYXR1cmVOb3RpZmljYXRpb24uanMiLCJkaXJlY3RpdmVzL3NwaW5uZXIuanMiLCJkaXJlY3RpdmVzL3VzZXJWb2ljZS5qcyIsInNlcnZpY2VzL21vZGFsU2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonLCBbJ2ZpcmViYXNlJyxcbiAgICAgICAgICAgICAgICduZ0RpYWxvZycsXG4gICAgICAgICAgICAgICAnbHZsLmRpcmVjdGl2ZXMuZHJhZ2Ryb3AnLFxuICAgICAgICAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAgICAgICAgJ25nQXJpYSddKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnQXV0aCcsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWFpblJlZiA9IG5ldyBGaXJlYmFzZSgnaHR0cHM6Ly9ibGluZGluZy10b3JjaC02NjYyLmZpcmViYXNlaW8uY29tJyk7XG5cbiAgICBmdW5jdGlvbiBsb2dVc2VyKHVzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLnVuYXV0aCgpO1xuICAgICAgbWFpblJlZi5hdXRoV2l0aFBhc3N3b3JkKHtcbiAgICAgICAgZW1haWwgICAgOiB1c2VyICsgJ0BmaXJlaWRlYXouY29tJyxcbiAgICAgICAgcGFzc3dvcmQgOiB1c2VyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvciwgYXV0aERhdGEpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0xvZyB1c2VyIGZhaWxlZDogJywgZXJyb3IpO1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2soYXV0aERhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVVc2VyQW5kTG9nKG5ld1VzZXIsIGNhbGxiYWNrKSB7XG4gICAgICBtYWluUmVmLmNyZWF0ZVVzZXIoe1xuICAgICAgICBlbWFpbCAgICA6IG5ld1VzZXIgKyAnQGZpcmVpZGVhei5jb20nLFxuICAgICAgICBwYXNzd29yZCA6IG5ld1VzZXJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGUgdXNlciBmYWlsZWQ6ICcsIGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dVc2VyKG5ld1VzZXIsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBjcmVhdGVVc2VyQW5kTG9nOiBjcmVhdGVVc2VyQW5kTG9nLFxuICAgICAgbG9nVXNlcjogbG9nVXNlclxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4ubW9kdWxlKCdmaXJlaWRlYXonKVxuLmRpcmVjdGl2ZSgnZW50ZXJDbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0EnLFxuICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbSkge1xuICAgICAgZWxlbS5iaW5kKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzICYmIGV2ZW50LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAkKGVsZW1bMF0pLmZpbmQoJ2J1dHRvbicpLmZvY3VzKCk7XG4gICAgICAgICAgJChlbGVtWzBdKS5maW5kKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnRmlyZWJhc2VTZXJ2aWNlJywgWyckZmlyZWJhc2VBcnJheScsIGZ1bmN0aW9uICgkZmlyZWJhc2VBcnJheSkge1xuICAgIHZhciBmaXJlYmFzZVVybCA9ICdodHRwczovL3AycmV0cm8tMjljMjAuZmlyZWJhc2Vpby5jb20vJztcblxuICAgIGZ1bmN0aW9uIG5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpIHtcbiAgICAgIHJldHVybiAkZmlyZWJhc2VBcnJheShtZXNzYWdlc1JlZik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2VydmVyVGltZXN0YW1wKCkge1xuICAgICAgcmV0dXJuIEZpcmViYXNlLlNlcnZlclZhbHVlLlRJTUVTVEFNUDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNZXNzYWdlc1JlZih1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL21lc3NhZ2VzLycgKyB1c2VySWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE1lc3NhZ2VSZWYodXNlcklkLCBtZXNzYWdlSWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL21lc3NhZ2VzLycgKyB1c2VySWQgKyAnLycgKyBtZXNzYWdlSWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvYXJkUmVmKHVzZXJJZCkge1xuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZShmaXJlYmFzZVVybCArICcvYm9hcmRzLycgKyB1c2VySWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEJvYXJkQ29sdW1ucyh1c2VySWQpIHtcbiAgICAgIHJldHVybiBuZXcgRmlyZWJhc2UoZmlyZWJhc2VVcmwgKyAnL2JvYXJkcy8nICsgdXNlcklkICsgJy9jb2x1bW5zJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5ld0ZpcmViYXNlQXJyYXk6IG5ld0ZpcmViYXNlQXJyYXksXG4gICAgICBnZXRTZXJ2ZXJUaW1lc3RhbXA6IGdldFNlcnZlclRpbWVzdGFtcCxcbiAgICAgIGdldE1lc3NhZ2VzUmVmOiBnZXRNZXNzYWdlc1JlZixcbiAgICAgIGdldE1lc3NhZ2VSZWY6IGdldE1lc3NhZ2VSZWYsXG4gICAgICBnZXRCb2FyZFJlZjogZ2V0Qm9hcmRSZWYsXG4gICAgICBnZXRCb2FyZENvbHVtbnM6IGdldEJvYXJkQ29sdW1uc1xuICAgIH07XG4gIH1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuY29udHJvbGxlcignTWFpbkN0cmwnLCBbJyRzY29wZScsICckZmlsdGVyJyxcbiAgICAnJHdpbmRvdycsICdVdGlscycsICdBdXRoJywgJyRyb290U2NvcGUnLCAnRmlyZWJhc2VTZXJ2aWNlJywgJ01vZGFsU2VydmljZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCAkZmlsdGVyLCAkd2luZG93LCB1dGlscywgYXV0aCwgJHJvb3RTY29wZSwgZmlyZWJhc2VTZXJ2aWNlLCBtb2RhbFNlcnZpY2UpIHtcbiAgICAgICRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICRzY29wZS5tZXNzYWdlVHlwZXMgPSB1dGlscy5tZXNzYWdlVHlwZXM7XG4gICAgICAkc2NvcGUudXRpbHMgPSB1dGlscztcbiAgICAgICRzY29wZS5uZXdCb2FyZCA9IHtcbiAgICAgICAgbmFtZTogJydcbiAgICAgIH07XG4gICAgICAkc2NvcGUudXNlcklkID0gJHdpbmRvdy5sb2NhdGlvbi5oYXNoLnN1YnN0cmluZygxKSB8fCAnJztcbiAgICAgICRzY29wZS5zb3J0RmllbGQgPSAnJGlkJztcbiAgICAgICRzY29wZS5zZWxlY3RlZFR5cGUgPSAxO1xuXG4gICAgICAkc2NvcGUuY2xvc2VBbGxNb2RhbHMgPSBmdW5jdGlvbigpe1xuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIGdldEJvYXJkQW5kTWVzc2FnZXModXNlckRhdGEpIHtcbiAgICAgICAgJHNjb3BlLnVzZXJJZCA9ICR3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSkgfHwgJzQ5OXNtJztcblxuICAgICAgICB2YXIgbWVzc2FnZXNSZWYgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0TWVzc2FnZXNSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIHZhciBib2FyZCA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZFJlZigkc2NvcGUudXNlcklkKTtcblxuICAgICAgICBib2FyZC5vbigndmFsdWUnLCBmdW5jdGlvbihib2FyZCkge1xuICAgICAgICAgICRzY29wZS5ib2FyZCA9IGJvYXJkLnZhbCgpO1xuICAgICAgICAgICRzY29wZS5ib2FyZElkID0gJHJvb3RTY29wZS5ib2FyZElkID0gYm9hcmQudmFsKCkuYm9hcmRJZDtcbiAgICAgICAgICAkc2NvcGUuYm9hcmRDb250ZXh0ID0gJHJvb3RTY29wZS5ib2FyZENvbnRleHQgPSBib2FyZC52YWwoKS5ib2FyZENvbnRleHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5ib2FyZFJlZiA9IGJvYXJkO1xuICAgICAgICAkc2NvcGUudXNlclVpZCA9IHVzZXJEYXRhLnVpZDtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzID0gZmlyZWJhc2VTZXJ2aWNlLm5ld0ZpcmViYXNlQXJyYXkobWVzc2FnZXNSZWYpO1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoJHNjb3BlLnVzZXJJZCAhPT0gJycpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2VzUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VzUmVmKCRzY29wZS51c2VySWQpO1xuICAgICAgICBhdXRoLmxvZ1VzZXIoJHNjb3BlLnVzZXJJZCwgZ2V0Qm9hcmRBbmRNZXNzYWdlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuaXNDb2x1bW5TZWxlY3RlZCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KCRzY29wZS5zZWxlY3RlZFR5cGUpID09PSBwYXJzZUludCh0eXBlKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5zZWVOb3RpZmljYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Z1bnJldHJvMScsIHRydWUpO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnNob3dOb3RpZmljYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZnVucmV0cm8xJykgJiYgJHNjb3BlLnVzZXJJZCAhPT0gJyc7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAkc2NvcGUuc29ydEZpZWxkID09PSAndm90ZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLnRvZ2dsZVZvdGUgPSBmdW5jdGlvbihrZXksIHZvdGVzKSB7XG4gICAgICAgIGlmICghbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KSkge1xuICAgICAgICAgIG1lc3NhZ2VzUmVmLmNoaWxkKGtleSkudXBkYXRlKHtcbiAgICAgICAgICAgIHZvdGVzOiB2b3RlcyArIDEsXG4gICAgICAgICAgICBkYXRlOiBmaXJlYmFzZVNlcnZpY2UuZ2V0U2VydmVyVGltZXN0YW1wKClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWVzc2FnZXNSZWYuY2hpbGQoa2V5KS51cGRhdGUoe1xuICAgICAgICAgICAgdm90ZXM6IHZvdGVzIC0gMSxcbiAgICAgICAgICAgIGRhdGU6IGZpcmViYXNlU2VydmljZS5nZXRTZXJ2ZXJUaW1lc3RhbXAoKVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gcmVkaXJlY3RUb0JvYXJkKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gK1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArICcjJyArICRzY29wZS51c2VySWQ7XG4gICAgICB9XG5cbiAgICAgICRzY29wZS5jcmVhdGVOZXdCb2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgICAkc2NvcGUudXNlcklkID0gdXRpbHMuY3JlYXRlVXNlcklkKCk7XG5cbiAgICAgICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24odXNlckRhdGEpIHtcbiAgICAgICAgICB2YXIgYm9hcmQgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRSZWYoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgICAgYm9hcmQuc2V0KHtcbiAgICAgICAgICAgIGJvYXJkSWQ6ICRzY29wZS5uZXdCb2FyZC5uYW1lLFxuICAgICAgICAgICAgZGF0ZV9jcmVhdGVkOiBuZXcgRGF0ZSgpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBjb2x1bW5zOiAkc2NvcGUubWVzc2FnZVR5cGVzLFxuICAgICAgICAgICAgdXNlcl9pZDogdXNlckRhdGEudWlkXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZWRpcmVjdFRvQm9hcmQoKTtcblxuICAgICAgICAgICRzY29wZS5uZXdCb2FyZC5uYW1lID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgYXV0aC5jcmVhdGVVc2VyQW5kTG9nKCRzY29wZS51c2VySWQsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5jaGFuZ2VCb2FyZENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkUmVmLnVwZGF0ZSh7XG4gICAgICAgICAgYm9hcmRDb250ZXh0OiAkc2NvcGUuYm9hcmRDb250ZXh0XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmFkZE5ld0NvbHVtbiA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnMucHVzaCh7XG4gICAgICAgICAgdmFsdWU6IG5hbWUsXG4gICAgICAgICAgaWQ6IHV0aWxzLmdldE5leHRJZCgkc2NvcGUuYm9hcmQpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBib2FyZENvbHVtbnMgPSBmaXJlYmFzZVNlcnZpY2UuZ2V0Qm9hcmRDb2x1bW5zKCRzY29wZS51c2VySWQpO1xuICAgICAgICBib2FyZENvbHVtbnMuc2V0KHV0aWxzLnRvT2JqZWN0KCRzY29wZS5ib2FyZC5jb2x1bW5zKSk7XG5cbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuY2hhbmdlQ29sdW1uTmFtZSA9IGZ1bmN0aW9uKGlkLCBuZXdOYW1lKSB7XG4gICAgICAgICRzY29wZS5ib2FyZC5jb2x1bW5zW2lkIC0gMV0gPSB7XG4gICAgICAgICAgdmFsdWU6IG5ld05hbWUsXG4gICAgICAgICAgaWQ6IGlkXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcblxuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVDb2x1bW4gPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgJHNjb3BlLmJvYXJkLmNvbHVtbnMgPSAkc2NvcGUuYm9hcmQuY29sdW1ucy5maWx0ZXIoZnVuY3Rpb24oX2NvbHVtbikge1xuICAgICAgICAgICAgcmV0dXJuIF9jb2x1bW4uaWQgIT09IGNvbHVtbi5pZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGJvYXJkQ29sdW1ucyA9IGZpcmViYXNlU2VydmljZS5nZXRCb2FyZENvbHVtbnMoJHNjb3BlLnVzZXJJZCk7XG4gICAgICAgIGJvYXJkQ29sdW1ucy5zZXQodXRpbHMudG9PYmplY3QoJHNjb3BlLmJvYXJkLmNvbHVtbnMpKTtcbiAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICB9O1xuXG4gICAgICAkc2NvcGUuZGVsZXRlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgJHNjb3BlLm1lc3NhZ2VzLiRyZW1vdmUobWVzc2FnZSk7XG4gICAgICAgIG1vZGFsU2VydmljZS5jbG9zZUFsbCgpO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gYWRkTWVzc2FnZUNhbGxiYWNrKG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGlkID0gbWVzc2FnZS5rZXkoKTtcbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCQoJyMnICsgaWQpKS5zY29wZSgpLmlzRWRpdGluZyA9IHRydWU7XG4gICAgICAgICQoJyMnICsgaWQpLmZpbmQoJ3RleHRhcmVhJykuZm9jdXMoKTtcbiAgICAgIH1cblxuICAgICAgJHNjb3BlLmFkZE5ld01lc3NhZ2UgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICRzY29wZS5tZXNzYWdlcy4kYWRkKHtcbiAgICAgICAgICB0ZXh0OiAnJyxcbiAgICAgICAgICB1c2VyX2lkOiAkc2NvcGUudXNlclVpZCxcbiAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICBpZDogdHlwZS5pZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGF0ZTogZmlyZWJhc2VTZXJ2aWNlLmdldFNlcnZlclRpbWVzdGFtcCgpLFxuICAgICAgICAgIHZvdGVzOiAwXG4gICAgICAgIH0pLnRoZW4oYWRkTWVzc2FnZUNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5kZWxldGVDYXJkcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCRzY29wZS5tZXNzYWdlcykuZWFjaChmdW5jdGlvbihpbmRleCwgbWVzc2FnZSkge1xuICAgICAgICAgICRzY29wZS5tZXNzYWdlcy4kcmVtb3ZlKG1lc3NhZ2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICBtb2RhbFNlcnZpY2UuY2xvc2VBbGwoKTtcbiAgICAgIH07XG5cbiAgICAgICRzY29wZS5nZXRCb2FyZFRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCRzY29wZS5ib2FyZCkge1xuICAgICAgICAgIHZhciBjbGlwYm9hcmQgPSAnJztcblxuICAgICAgICAgICQoJHNjb3BlLmJvYXJkLmNvbHVtbnMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGNvbHVtbikge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnPHN0cm9uZz4nICsgY29sdW1uLnZhbHVlICsgJzwvc3Ryb25nPjxiciAvPic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjbGlwYm9hcmQgKz0gJzxiciAvPjxzdHJvbmc+JyArIGNvbHVtbi52YWx1ZSArICc8L3N0cm9uZz48YnIgLz4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZpbHRlcmVkQXJyYXkgPSAkZmlsdGVyKCdvcmRlckJ5JykoJHNjb3BlLm1lc3NhZ2VzLFxuICAgICAgICAgICAgICAkc2NvcGUuc29ydEZpZWxkLFxuICAgICAgICAgICAgICAkc2NvcGUuZ2V0U29ydE9yZGVyKCkpO1xuXG4gICAgICAgICAgICAkKGZpbHRlcmVkQXJyYXkpLmVhY2goZnVuY3Rpb24oaW5kZXgyLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGUuaWQgPT09IGNvbHVtbi5pZCkge1xuICAgICAgICAgICAgICAgIGNsaXBib2FyZCArPSAnLSAnICsgbWVzc2FnZS50ZXh0ICsgJyAoJyArIG1lc3NhZ2Uudm90ZXMgKyAnIHZvdGVzKSA8YnIgLz4nO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybiBjbGlwYm9hcmQ7XG4gICAgICAgIH0gZWxzZSByZXR1cm4gJyc7XG4gICAgICB9O1xuXG4gICAgICBhbmd1bGFyLmVsZW1lbnQoJHdpbmRvdykuYmluZCgnaGFzaGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkc2NvcGUubG9hZGluZyA9IHRydWU7XG4gICAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpIHx8ICcnO1xuICAgICAgICBhdXRoLmxvZ1VzZXIoJHNjb3BlLnVzZXJJZCwgZ2V0Qm9hcmRBbmRNZXNzYWdlcyk7XG4gICAgICB9KTtcbiAgICB9XG4gIF0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5jb250cm9sbGVyKCdNZXNzYWdlQ3RybCcsIFsnJHNjb3BlJywgJyRmaWx0ZXInLFxuICAgICAgICAgICAgICAnJHdpbmRvdycsICdBdXRoJywgJyRyb290U2NvcGUnLCAnRmlyZWJhc2VTZXJ2aWNlJywgJ01vZGFsU2VydmljZScsXG4gICAgZnVuY3Rpb24oJHNjb3BlLCAkZmlsdGVyLCAkd2luZG93LCBhdXRoLCAkcm9vdFNjb3BlLCBmaXJlYmFzZVNlcnZpY2UsIG1vZGFsU2VydmljZSkge1xuICAgICAgJHNjb3BlLm1vZGFsU2VydmljZSA9IG1vZGFsU2VydmljZTtcbiAgICAgICRzY29wZS51c2VySWQgPSAkd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKDEpO1xuXG4gICAgICAkc2NvcGUuZHJvcHBlZEV2ZW50ID0gZnVuY3Rpb24oZHJhZ0VsLCBkcm9wRWwpIHtcbiAgICAgICAgaWYoZHJhZ0VsICE9PSBkcm9wRWwpIHtcbiAgICAgICAgICAkc2NvcGUuZHJhZ0VsID0gZHJhZ0VsO1xuICAgICAgICAgICRzY29wZS5kcm9wRWwgPSBkcm9wRWw7XG5cbiAgICAgICAgICBtb2RhbFNlcnZpY2Uub3Blbk1lcmdlQ2FyZHMoJHNjb3BlKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJHNjb3BlLmRyb3BwZWQgPSBmdW5jdGlvbihkcmFnRWwsIGRyb3BFbCkge1xuICAgICAgICB2YXIgZHJhZyA9ICQoJyMnICsgZHJhZ0VsKTtcbiAgICAgICAgdmFyIGRyb3AgPSAkKCcjJyArIGRyb3BFbCk7XG5cbiAgICAgICAgdmFyIGRyb3BNZXNzYWdlUmVmID0gZmlyZWJhc2VTZXJ2aWNlLmdldE1lc3NhZ2VSZWYoJHNjb3BlLnVzZXJJZCwgZHJvcC5hdHRyKCdtZXNzYWdlSWQnKSk7XG4gICAgICAgIHZhciBkcmFnTWVzc2FnZVJlZiA9IGZpcmViYXNlU2VydmljZS5nZXRNZXNzYWdlUmVmKCRzY29wZS51c2VySWQsIGRyYWcuYXR0cignbWVzc2FnZUlkJykpO1xuXG4gICAgICAgIGRyb3BNZXNzYWdlUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZHJvcE1lc3NhZ2UpIHtcbiAgICAgICAgICBkcmFnTWVzc2FnZVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRyYWdNZXNzYWdlKSB7XG4gICAgICAgICAgICBkcm9wTWVzc2FnZVJlZi51cGRhdGUoe1xuICAgICAgICAgICAgICB0ZXh0OiBkcm9wTWVzc2FnZS52YWwoKS50ZXh0ICsgJyB8ICcgKyBkcmFnTWVzc2FnZS52YWwoKS50ZXh0LFxuICAgICAgICAgICAgICB2b3RlczogZHJvcE1lc3NhZ2UudmFsKCkudm90ZXMgKyBkcmFnTWVzc2FnZS52YWwoKS52b3Rlc1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGRyYWdNZXNzYWdlUmVmLnJlbW92ZSgpO1xuICAgICAgICAgICAgbW9kYWxTZXJ2aWNlLmNsb3NlQWxsKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XVxuICApO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyXG4gIC5tb2R1bGUoJ2ZpcmVpZGVheicpXG4gIC5zZXJ2aWNlKCdVdGlscycsIFtmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gY3JlYXRlVXNlcklkKCkge1xuICAgICAgdmFyIHRleHQgPSAnJztcbiAgICAgIHZhciBwb3NzaWJsZSA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuXG4gICAgICBmb3IoIHZhciBpPTA7IGkgPCA1OyBpKysgKSB7XG4gICAgICAgIHRleHQgKz0gcG9zc2libGUuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBvc3NpYmxlLmxlbmd0aCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGV4dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhbHJlYWR5Vm90ZWQoa2V5KSB7XG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb2N1c0VsZW1lbnQoaWQpIHtcbiAgICAgICQoJyMnICsgaWQpLmZpbmQoJ3RleHRhcmVhJykuZm9jdXMoKTtcbiAgICB9XG5cbiAgICB2YXIgbWVzc2FnZVR5cGVzID0gW3tcbiAgICAgIGlkOiAxLFxuICAgICAgdmFsdWU6ICdXZW50IHdlbGwnXG4gICAgfSwge1xuICAgICAgaWQ6IDIsXG4gICAgICB2YWx1ZTogJ1RvIGltcHJvdmUnXG4gICAgfSwge1xuICAgICAgaWQ6IDMsXG4gICAgICB2YWx1ZTogJ0FjdGlvbiBpdGVtcydcbiAgICB9XTtcblxuICAgIGZ1bmN0aW9uIGdldE5leHRJZChib2FyZCkge1xuICAgICAgcmV0dXJuIGJvYXJkLmNvbHVtbnMuc2xpY2UoLTEpLnBvcCgpLmlkICsgMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b09iamVjdChhcnJheSkge1xuICAgICAgdmFyIG9iamVjdCA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG9iamVjdFtpXSA9IHtcbiAgICAgICAgICBpZDogYXJyYXlbaV0uaWQsXG4gICAgICAgICAgdmFsdWU6IGFycmF5W2ldLnZhbHVlXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sdW1uQ2xhc3MoaWQpIHtcbiAgICAgIHJldHVybiBcImNvbHVtbl9cIiArIChpZCAlIDYgfHwgNik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNyZWF0ZVVzZXJJZDogY3JlYXRlVXNlcklkLFxuICAgICAgYWxyZWFkeVZvdGVkOiBhbHJlYWR5Vm90ZWQsXG4gICAgICBmb2N1c0VsZW1lbnQ6IGZvY3VzRWxlbWVudCxcbiAgICAgIG1lc3NhZ2VUeXBlczogbWVzc2FnZVR5cGVzLFxuICAgICAgZ2V0TmV4dElkOiBnZXROZXh0SWQsXG4gICAgICB0b09iamVjdDogdG9PYmplY3QsXG4gICAgICBjb2x1bW5DbGFzczogY29sdW1uQ2xhc3NcbiAgICB9O1xuICB9XSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2JvYXJkQ29udGV4dCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvYm9hcmRDb250ZXh0Lmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ2RpYWxvZ3MnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2RpYWxvZ3MuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgncGFnZUZvb3RlcicsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvZm9vdGVyLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3BhZ2VIZWFkZXInLCBbJ01vZGFsU2VydmljZScsIGZ1bmN0aW9uKG1vZGFsU2VydmljZSkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL2hlYWRlci5odG1sJyxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICAkc2NvcGUubW9kYWxTZXJ2aWNlID0gbW9kYWxTZXJ2aWNlO1xuICAgICAgfVxuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluQ29udGVudCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9tYWluQ29udGVudC5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCdtYWluUGFnZScsIFsnTW9kYWxTZXJ2aWNlJywgZnVuY3Rpb24obW9kYWxTZXJ2aWNlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL21haW5QYWdlLmh0bWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgICRzY29wZS5tb2RhbFNlcnZpY2UgPSBtb2RhbFNlcnZpY2U7XG4gICAgICB9XG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ21lbnUnLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsIDogJ2NvbXBvbmVudHMvbWVudS5odG1sJ1xuICAgIH07XG4gIH1dXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnZmlyZWlkZWF6JykuZGlyZWN0aXZlKCduZXdGZWF0dXJlTm90aWZpY2F0aW9uJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy9uZXdGZWF0dXJlTm90aWZpY2F0aW9uLmh0bWwnXG4gICAgfTtcbiAgfV1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdmaXJlaWRlYXonKS5kaXJlY3RpdmUoJ3NwaW5uZXInLCBbZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0ZW1wbGF0ZVVybCA6ICdjb21wb25lbnRzL3NwaW5uZXIuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2ZpcmVpZGVheicpLmRpcmVjdGl2ZSgndXNlclZvaWNlJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdGVtcGxhdGVVcmwgOiAnY29tcG9uZW50cy91c2VyVm9pY2UuaHRtbCdcbiAgICB9O1xuICB9XVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAubW9kdWxlKCdmaXJlaWRlYXonKVxuICAuc2VydmljZSgnTW9kYWxTZXJ2aWNlJywgWyduZ0RpYWxvZycsIGZ1bmN0aW9uKG5nRGlhbG9nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wZW5BZGROZXdDb2x1bW46IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnYWRkTmV3Q29sdW1uJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5BZGROZXdCb2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdhZGROZXdCb2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuRGVsZXRlQ2FyZDogZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgbmdEaWFsb2cub3Blbih7XG4gICAgICAgICAgdGVtcGxhdGU6ICdkZWxldGVDYXJkJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIG9wZW5EZWxldGVDb2x1bW46IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnZGVsZXRlQ29sdW1uJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbicsXG4gICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgIH0pO1xuICAgICAgfSxcblxuICAgICAgb3Blbk1lcmdlQ2FyZHM6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIG5nRGlhbG9nLm9wZW4oe1xuICAgICAgICAgIHRlbXBsYXRlOiAnbWVyZ2VDYXJkcycsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4nLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBvcGVuQ29weUJvYXJkOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2NvcHlCb2FyZCcsXG4gICAgICAgICAgY2xhc3NOYW1lOiAnbmdkaWFsb2ctdGhlbWUtcGxhaW4gYmlnRGlhbG9nJyxcbiAgICAgICAgICBzY29wZTogc2NvcGVcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgb3BlbkRlbGV0ZUNhcmRzOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBuZ0RpYWxvZy5vcGVuKHtcbiAgICAgICAgICB0ZW1wbGF0ZTogJ2RlbGV0ZUNhcmRzJyxcbiAgICAgICAgICBjbGFzc05hbWU6ICduZ2RpYWxvZy10aGVtZS1wbGFpbiBkYW5nZXInLFxuICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBjbG9zZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIG5nRGlhbG9nLmNsb3NlQWxsKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfV0pO1xuIl19
