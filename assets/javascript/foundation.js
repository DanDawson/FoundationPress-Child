window.whatInput = function () {

  'use strict';

  /*
    ---------------
    variables
    ---------------
  */

  // array of actively pressed keys

  var activeKeys = [];

  // cache document.body
  var body;

  // boolean: true if touch buffer timer is running
  var buffer = false;

  // the last used input type
  var currentInput = null;

  // `input` types that don't accept text
  var nonTypingInputs = ['button', 'checkbox', 'file', 'image', 'radio', 'reset', 'submit'];

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  var mouseWheel = detectWheel();

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  var ignoreMap = [16, // shift
  17, // control
  18, // alt
  91, // Windows key / left Apple cmd
  93 // Windows menu / right Apple cmd
  ];

  // mapping of events to input types
  var inputMap = {
    'keydown': 'keyboard',
    'keyup': 'keyboard',
    'mousedown': 'mouse',
    'mousemove': 'mouse',
    'MSPointerDown': 'pointer',
    'MSPointerMove': 'pointer',
    'pointerdown': 'pointer',
    'pointermove': 'pointer',
    'touchstart': 'touch'
  };

  // add correct mouse wheel event mapping to `inputMap`
  inputMap[detectWheel()] = 'mouse';

  // array of all used input types
  var inputTypes = [];

  // mapping of key codes to a common name
  var keyMap = {
    9: 'tab',
    13: 'enter',
    16: 'shift',
    27: 'esc',
    32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  };

  // map of IE 10 pointer events
  var pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  };

  // touch buffer timer
  var timer;

  /*
    ---------------
    functions
    ---------------
  */

  // allows events that are also triggered to be filtered out for `touchstart`
  function eventBuffer() {
    clearTimer();
    setInput(event);

    buffer = true;
    timer = window.setTimeout(function () {
      buffer = false;
    }, 650);
  }

  function bufferedEvent(event) {
    if (!buffer) setInput(event);
  }

  function unBufferedEvent(event) {
    clearTimer();
    setInput(event);
  }

  function clearTimer() {
    window.clearTimeout(timer);
  }

  function setInput(event) {
    var eventKey = key(event);
    var value = inputMap[event.type];
    if (value === 'pointer') value = pointerType(event);

    // don't do anything if the value matches the input type already set
    if (currentInput !== value) {
      var eventTarget = target(event);
      var eventTargetNode = eventTarget.nodeName.toLowerCase();
      var eventTargetType = eventTargetNode === 'input' ? eventTarget.getAttribute('type') : null;

      if ( // only if the user flag to allow typing in form fields isn't set
      !body.hasAttribute('data-whatinput-formtyping') &&

      // only if currentInput has a value
      currentInput &&

      // only if the input is `keyboard`
      value === 'keyboard' &&

      // not if the key is `TAB`
      keyMap[eventKey] !== 'tab' && (

      // only if the target is a form input that accepts text
      eventTargetNode === 'textarea' || eventTargetNode === 'select' || eventTargetNode === 'input' && nonTypingInputs.indexOf(eventTargetType) < 0) ||
      // ignore modifier keys
      ignoreMap.indexOf(eventKey) > -1) {
        // ignore keyboard typing
      } else {
        switchInput(value);
      }
    }

    if (value === 'keyboard') logKeys(eventKey);
  }

  function switchInput(string) {
    currentInput = string;
    body.setAttribute('data-whatinput', currentInput);

    if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
  }

  function key(event) {
    return event.keyCode ? event.keyCode : event.which;
  }

  function target(event) {
    return event.target || event.srcElement;
  }

  function pointerType(event) {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType];
    } else {
      return event.pointerType === 'pen' ? 'touch' : event.pointerType; // treat pen like touch
    }
  }

  // keyboard logging
  function logKeys(eventKey) {
    if (activeKeys.indexOf(keyMap[eventKey]) === -1 && keyMap[eventKey]) activeKeys.push(keyMap[eventKey]);
  }

  function unLogKeys(event) {
    var eventKey = key(event);
    var arrayPos = activeKeys.indexOf(keyMap[eventKey]);

    if (arrayPos !== -1) activeKeys.splice(arrayPos, 1);
  }

  function bindEvents() {
    body = document.body;

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      body.addEventListener('pointerdown', bufferedEvent);
      body.addEventListener('pointermove', bufferedEvent);
    } else if (window.MSPointerEvent) {
      body.addEventListener('MSPointerDown', bufferedEvent);
      body.addEventListener('MSPointerMove', bufferedEvent);
    } else {

      // mouse events
      body.addEventListener('mousedown', bufferedEvent);
      body.addEventListener('mousemove', bufferedEvent);

      // touch events
      if ('ontouchstart' in window) {
        body.addEventListener('touchstart', eventBuffer);
      }
    }

    // mouse wheel
    body.addEventListener(mouseWheel, bufferedEvent);

    // keyboard events
    body.addEventListener('keydown', unBufferedEvent);
    body.addEventListener('keyup', unBufferedEvent);
    document.addEventListener('keyup', unLogKeys);
  }

  /*
    ---------------
    utilities
    ---------------
  */

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  function detectWheel() {
    return mouseWheel = 'onwheel' in document.createElement('div') ? 'wheel' : // Modern browsers support "wheel"

    document.onmousewheel !== undefined ? 'mousewheel' : // Webkit and IE support at least "mousewheel"
    'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox
  }

  /*
    ---------------
    init
     don't start script unless browser cuts the mustard,
    also passes if polyfills are used
    ---------------
  */

  if ('addEventListener' in window && Array.prototype.indexOf) {

    // if the dom is already ready already (script was placed at bottom of <body>)
    if (document.body) {
      bindEvents();

      // otherwise wait for the dom to load (script was placed in the <head>)
    } else {
      document.addEventListener('DOMContentLoaded', bindEvents);
    }
  }

  /*
    ---------------
    api
    ---------------
  */

  return {

    // returns string: the current input type
    ask: function () {
      return currentInput;
    },

    // returns array: currently pressed keys
    keys: function () {
      return activeKeys;
    },

    // returns array: all the detected input types
    types: function () {
      return inputTypes;
    },

    // accepts string: manually set the input type
    set: switchInput
  };
}();
;!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.2.4';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr(`data-${ pluginName }`)) {
        plugin.$element.attr(`data-${ pluginName }`, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger(`init.zf.${ pluginName }`);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr(`data-${ pluginName }`).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger(`destroyed.zf.${ pluginName }`);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? `-${ namespace }` : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError(`We're sorry, ${ type } is not a valid parameter. You must use a string representing the method you wish to invoke.`);
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if (/true/.test(str)) return true;else if (/false/.test(str)) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  const keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey(event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();
      if (event.shiftKey) key = `SHIFT_${ key }`;
      if (event.ctrlKey) key = `CTRL_${ key }`;
      if (event.altKey) key = `ALT_${ key }`;
      return key;
    },

    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey(event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },

    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable($element) {
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },

    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register(componentName, cmds) {
      commands[componentName] = cmds;
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) k[kcs[kc]] = kcs[kc];
    return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  const defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init() {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: `only screen and (min-width: ${ namedQueries[key] })`
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },

    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast(size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },

    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get(size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },

    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize() {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },

    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher() {
      $(window).on('resize.zf.mediaquery', () => {
        var newSize = this._getCurrentSize(),
            currentSize = this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium(media) {
          var text = `@media ${ media }{ #matchmediajs-test { width: 1px; } }`;

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  const initClasses = ['mui-enter', 'mui-leave'];
  const activeClasses = ['mui-enter-active', 'mui-leave-active'];

  const Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    function move(ts) {
      if (!start) start = window.performance.now();
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(() => {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(() => {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(`${ initClass } ${ activeClass } ${ animation }`);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  const Nest = {
    Feather(menu, type = 'zf') {
      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = `is-${ type }-submenu`,
          subItemClass = `${ subMenuClass }-item`,
          hasSubClass = `is-${ type }-submenu-parent`;

      menu.find('a:first').attr('tabindex', 0);

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-expanded': false,
            'aria-label': $item.children('a:first').text()
          });

          $sub.addClass(`submenu ${ subMenuClass }`).attr({
            'data-submenu': '',
            'aria-hidden': true,
            'role': 'menu'
          });
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass(`is-submenu-item ${ subItemClass }`);
        }
      });

      return;
    },

    Burn(menu, type) {
      var items = menu.find('li').removeAttr('tabindex'),
          subMenuClass = `is-${ type }-submenu`,
          subItemClass = `${ subMenuClass }-item`,
          hasSubClass = `is-${ type }-submenu-parent`;

      menu.find('>li, .menu, .menu > li').removeClass(`${ subMenuClass } ${ subItemClass } ${ hasSubClass } is-submenu-item submenu is-active`).removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger(`timerstart.zf.${ nameSpace }`);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger(`timerpaused.zf.${ nameSpace }`);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      if (this.complete) {
        singleImageLoaded();
      } else if (typeof this.naturalWidth !== 'undefined' && this.naturalWidth > 0) {
        singleImageLoaded();
      } else {
        $(this).one('load', function () {
          singleImageLoaded();
        });
      }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger(`swipe${ dir }`);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special[`swipe${ this }`] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  const MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (`${ prefixes[i] }MutationObserver` in window) {
        return window[`${ prefixes[i] }MutationObserver`];
      }
    }
    return false;
  }();

  const triggers = (el, type) => {
    el.data(type).split(' ').forEach(id => {
      $(`#${ id }`)[type === 'close' ? 'trigger' : 'triggerHandler'](`${ type }.zf.trigger`, [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    let id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    triggers($(this), 'toggle');
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    let animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    let id = $(this).data('toggle-focus');
    $(`#${ id }`).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', () => {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      let listeners = plugNames.map(name => {
        return `closeme.zf.${ name }`;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        let plugin = e.namespace.split('.')[0];
        let plugins = $(`[data-${ plugin }]`).not(`[data-yeti-box="${ pluginId }"]`);

        plugins.each(function () {
          let _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    let timer,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    let timer,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    let nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);
      //trigger the event handler for the element depending on type
      switch ($target.attr("data-events")) {

        case "resize":
          $target.triggerHandler('resizeme.zf.trigger', [$target]);
          break;

        case "scroll":
          $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          break;

        // case "mutate" :
        // console.log('mutate', $target);
        // $target.triggerHandler('mutate.zf.trigger');
        //
        // //make sure we don't get stuck in an infinite loop from sloppy codeing
        // if ($target.index('[data-mutate]') == $("[data-mutate]").length-1) {
        //   domMutationObserver();
        // }
        // break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, (or coming soon mutation) add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        let elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: false, characterData: false, subtree: false, attributeFilter: ["data-events"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
;'use strict';

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  class Abide {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options = {}) {
      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */
    _init() {
      this.$inputs = this.$element.find('input, textarea, select');

      this._events();
    }

    /**
     * Initializes events for Abide.
     * @private
     */
    _events() {
      this.$element.off('.abide').on('reset.zf.abide', () => {
        this.resetForm();
      }).on('submit.zf.abide', () => {
        return this.validateForm();
      });

      if (this.options.validateOn === 'fieldChange') {
        this.$inputs.off('change.zf.abide').on('change.zf.abide', e => {
          this.validateInput($(e.target));
        });
      }

      if (this.options.liveValidate) {
        this.$inputs.off('input.zf.abide').on('input.zf.abide', e => {
          this.validateInput($(e.target));
        });
      }
    }

    /**
     * Calls necessary functions to update Abide upon DOM change
     * @private
     */
    _reflow() {
      this._init();
    }

    /**
     * Checks whether or not a form element has the required attribute and if it's checked or not
     * @param {Object} element - jQuery object to check for required attribute
     * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
     */
    requiredCheck($el) {
      if (!$el.attr('required')) return true;

      var isGood = true;

      switch ($el[0].type) {
        case 'checkbox':
          isGood = $el[0].checked;
          break;

        case 'select':
        case 'select-one':
        case 'select-multiple':
          var opt = $el.find('option:selected');
          if (!opt.length || !opt.val()) isGood = false;
          break;

        default:
          if (!$el.val() || !$el.val().length) isGood = false;
      }

      return isGood;
    }

    /**
     * Based on $el, get the first element with selector in this order:
     * 1. The element's direct sibling('s).
     * 3. The element's parent's children.
     *
     * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
     *
     * @param {Object} $el - jQuery object to use as reference to find the form error selector.
     * @returns {Object} jQuery object with the selector.
     */
    findFormError($el) {
      var $error = $el.siblings(this.options.formErrorSelector);

      if (!$error.length) {
        $error = $el.parent().find(this.options.formErrorSelector);
      }

      return $error;
    }

    /**
     * Get the first element in this order:
     * 2. The <label> with the attribute `[for="someInputId"]`
     * 3. The `.closest()` <label>
     *
     * @param {Object} $el - jQuery object to check for required attribute
     * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
     */
    findLabel($el) {
      var id = $el[0].id;
      var $label = this.$element.find(`label[for="${ id }"]`);

      if (!$label.length) {
        return $el.closest('label');
      }

      return $label;
    }

    /**
     * Get the set of labels associated with a set of radio els in this order
     * 2. The <label> with the attribute `[for="someInputId"]`
     * 3. The `.closest()` <label>
     *
     * @param {Object} $el - jQuery object to check for required attribute
     * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
     */
    findRadioLabels($els) {
      var labels = $els.map((i, el) => {
        var id = el.id;
        var $label = this.$element.find(`label[for="${ id }"]`);

        if (!$label.length) {
          $label = $(el).closest('label');
        }
        return $label[0];
      });

      return $(labels);
    }

    /**
     * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
     * @param {Object} $el - jQuery object to add the class to
     */
    addErrorClasses($el) {
      var $label = this.findLabel($el);
      var $formError = this.findFormError($el);

      if ($label.length) {
        $label.addClass(this.options.labelErrorClass);
      }

      if ($formError.length) {
        $formError.addClass(this.options.formErrorClass);
      }

      $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
    }

    /**
     * Remove CSS error classes etc from an entire radio button group
     * @param {String} groupName - A string that specifies the name of a radio button group
     *
     */

    removeRadioErrorClasses(groupName) {
      var $els = this.$element.find(`:radio[name="${ groupName }"]`);
      var $labels = this.findRadioLabels($els);
      var $formErrors = this.findFormError($els);

      if ($labels.length) {
        $labels.removeClass(this.options.labelErrorClass);
      }

      if ($formErrors.length) {
        $formErrors.removeClass(this.options.formErrorClass);
      }

      $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
    }

    /**
     * Removes CSS error class as specified by the Abide settings from the label, input, and the form
     * @param {Object} $el - jQuery object to remove the class from
     */
    removeErrorClasses($el) {
      // radios need to clear all of the els
      if ($el[0].type == 'radio') {
        return this.removeRadioErrorClasses($el.attr('name'));
      }

      var $label = this.findLabel($el);
      var $formError = this.findFormError($el);

      if ($label.length) {
        $label.removeClass(this.options.labelErrorClass);
      }

      if ($formError.length) {
        $formError.removeClass(this.options.formErrorClass);
      }

      $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
    }

    /**
     * Goes through a form to find inputs and proceeds to validate them in ways specific to their type
     * @fires Abide#invalid
     * @fires Abide#valid
     * @param {Object} element - jQuery object to validate, should be an HTML input
     * @returns {Boolean} goodToGo - If the input is valid or not.
     */
    validateInput($el) {
      var clearRequire = this.requiredCheck($el),
          validated = false,
          customValidator = true,
          validator = $el.attr('data-validator'),
          equalTo = true;

      // don't validate ignored inputs or hidden inputs
      if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]')) {
        return true;
      }

      switch ($el[0].type) {
        case 'radio':
          validated = this.validateRadio($el.attr('name'));
          break;

        case 'checkbox':
          validated = clearRequire;
          break;

        case 'select':
        case 'select-one':
        case 'select-multiple':
          validated = clearRequire;
          break;

        default:
          validated = this.validateText($el);
      }

      if (validator) {
        customValidator = this.matchValidation($el, validator, $el.attr('required'));
      }

      if ($el.attr('data-equalto')) {
        equalTo = this.options.validators.equalTo($el);
      }

      var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
      var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

      this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

      /**
       * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
       * Trigger includes the DOM element of the input.
       * @event Abide#valid
       * @event Abide#invalid
       */
      $el.trigger(message, [$el]);

      return goodToGo;
    }

    /**
     * Goes through a form and if there are any invalid inputs, it will display the form error element
     * @returns {Boolean} noError - true if no errors were detected...
     * @fires Abide#formvalid
     * @fires Abide#forminvalid
     */
    validateForm() {
      var acc = [];
      var _this = this;

      this.$inputs.each(function () {
        acc.push(_this.validateInput($(this)));
      });

      var noError = acc.indexOf(false) === -1;

      this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

      /**
       * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
       * Trigger includes the element of the form.
       * @event Abide#formvalid
       * @event Abide#forminvalid
       */
      this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

      return noError;
    }

    /**
     * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
     * @param {Object} $el - jQuery object to validate, should be a text input HTML element
     * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
     * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
     */
    validateText($el, pattern) {
      // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
      pattern = pattern || $el.attr('pattern') || $el.attr('type');
      var inputText = $el.val();
      var valid = false;

      if (inputText.length) {
        // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
        if (this.options.patterns.hasOwnProperty(pattern)) {
          valid = this.options.patterns[pattern].test(inputText);
        }
        // If the pattern name isn't also the type attribute of the field, then test it as a regexp
        else if (pattern !== $el.attr('type')) {
            valid = new RegExp(pattern).test(inputText);
          } else {
            valid = true;
          }
      }
      // An empty field is valid if it's not required
      else if (!$el.prop('required')) {
          valid = true;
        }

      return valid;
    }

    /**
     * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
     * @param {String} groupName - A string that specifies the name of a radio button group
     * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
     */
    validateRadio(groupName) {
      // If at least one radio in the group has the `required` attribute, the group is considered required
      // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
      var $group = this.$element.find(`:radio[name="${ groupName }"]`);
      var valid = false,
          required = false;

      // For the group to be required, at least one radio needs to be required
      $group.each((i, e) => {
        if ($(e).attr('required')) {
          required = true;
        }
      });
      if (!required) valid = true;

      if (!valid) {
        // For the group to be valid, at least one radio needs to be checked
        $group.each((i, e) => {
          if ($(e).prop('checked')) {
            valid = true;
          }
        });
      };

      return valid;
    }

    /**
     * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
     * @param {Object} $el - jQuery input element.
     * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
     * @param {Boolean} required - self explanatory?
     * @returns {Boolean} - true if validations passed.
     */
    matchValidation($el, validators, required) {
      required = required ? true : false;

      var clear = validators.split(' ').map(v => {
        return this.options.validators[v]($el, required, $el.parent());
      });
      return clear.indexOf(false) === -1;
    }

    /**
     * Resets form inputs and styles
     * @fires Abide#formreset
     */
    resetForm() {
      var $form = this.$element,
          opts = this.options;

      $(`.${ opts.labelErrorClass }`, $form).not('small').removeClass(opts.labelErrorClass);
      $(`.${ opts.inputErrorClass }`, $form).not('small').removeClass(opts.inputErrorClass);
      $(`${ opts.formErrorSelector }.${ opts.formErrorClass }`).removeClass(opts.formErrorClass);
      $form.find('[data-abide-error]').css('display', 'none');
      $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
      $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
      $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
      /**
       * Fires when the form has been reset.
       * @event Abide#formreset
       */
      $form.trigger('formreset.zf.abide', [$form]);
    }

    /**
     * Destroys an instance of Abide.
     * Removes error styles and classes from elements, without resetting their values.
     */
    destroy() {
      var _this = this;
      this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

      this.$inputs.off('.abide').each(function () {
        _this.removeErrorClasses($(this));
      });

      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @example 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @example 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @example 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @example '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @example 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @example false
     */
    liveValidate: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $(`#${ el.attr('data-equalto') }`).val() === el.val();
      }
    }
  };

  // Window exports
  Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  class Accordion {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */
    _init() {
      this.$element.attr('role', 'tablist');
      this.$tabs = this.$element.children('li, [data-accordion-item]');

      this.$tabs.each(function (idx, el) {
        var $el = $(el),
            $content = $el.children('[data-tab-content]'),
            id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
            linkId = el.id || `${ id }-label`;

        $el.find('a:first').attr({
          'aria-controls': id,
          'role': 'tab',
          'id': linkId,
          'aria-expanded': false,
          'aria-selected': false
        });

        $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
      });
      var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
      if ($initActive.length) {
        this.down($initActive, true);
      }
      this._events();
    }

    /**
     * Adds event handlers for items within the accordion.
     * @private
     */
    _events() {
      var _this = this;

      this.$tabs.each(function () {
        var $elem = $(this);
        var $tabContent = $elem.children('[data-tab-content]');
        if ($tabContent.length) {
          $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
            e.preventDefault();
            _this.toggle($tabContent);
          }).on('keydown.zf.accordion', function (e) {
            Foundation.Keyboard.handleKey(e, 'Accordion', {
              toggle: function () {
                _this.toggle($tabContent);
              },
              next: function () {
                var $a = $elem.next().find('a').focus();
                if (!_this.options.multiExpand) {
                  $a.trigger('click.zf.accordion');
                }
              },
              previous: function () {
                var $a = $elem.prev().find('a').focus();
                if (!_this.options.multiExpand) {
                  $a.trigger('click.zf.accordion');
                }
              },
              handled: function () {
                e.preventDefault();
                e.stopPropagation();
              }
            });
          });
        }
      });
    }

    /**
     * Toggles the selected content pane's open/close state.
     * @param {jQuery} $target - jQuery object of the pane to toggle (`.accordion-content`).
     * @function
     */
    toggle($target) {
      if ($target.parent().hasClass('is-active')) {
        this.up($target);
      } else {
        this.down($target);
      }
    }

    /**
     * Opens the accordion tab defined by `$target`.
     * @param {jQuery} $target - Accordion pane to open (`.accordion-content`).
     * @param {Boolean} firstTime - flag to determine if reflow should happen.
     * @fires Accordion#down
     * @function
     */
    down($target, firstTime) {
      $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

      if (!this.options.multiExpand && !firstTime) {
        var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
        if ($currentActive.length) {
          this.up($currentActive.not($target));
        }
      }

      $target.slideDown(this.options.slideSpeed, () => {
        /**
         * Fires when the tab is done opening.
         * @event Accordion#down
         */
        this.$element.trigger('down.zf.accordion', [$target]);
      });

      $(`#${ $target.attr('aria-labelledby') }`).attr({
        'aria-expanded': true,
        'aria-selected': true
      });
    }

    /**
     * Closes the tab defined by `$target`.
     * @param {jQuery} $target - Accordion tab to close (`.accordion-content`).
     * @fires Accordion#up
     * @function
     */
    up($target) {
      var $aunts = $target.parent().siblings(),
          _this = this;

      if (!this.options.allowAllClosed && !$aunts.hasClass('is-active') || !$target.parent().hasClass('is-active')) {
        return;
      }

      // Foundation.Move(this.options.slideSpeed, $target, function(){
      $target.slideUp(_this.options.slideSpeed, function () {
        /**
         * Fires when the tab is done collapsing up.
         * @event Accordion#up
         */
        _this.$element.trigger('up.zf.accordion', [$target]);
      });
      // });

      $target.attr('aria-hidden', true).parent().removeClass('is-active');

      $(`#${ $target.attr('aria-labelledby') }`).attr({
        'aria-expanded': false,
        'aria-selected': false
      });
    }

    /**
     * Destroys an instance of an accordion.
     * @fires Accordion#destroyed
     * @function
     */
    destroy() {
      this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
      this.$element.find('a').off('.zf.accordion');

      Foundation.unregisterPlugin(this);
    }
  }

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @example false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @example false
     */
    allowAllClosed: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  class AccordionMenu {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */
    _init() {
      this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
      this.$element.attr({
        'role': 'menu',
        'aria-multiselectable': this.options.multiOpen
      });

      this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
      this.$menuLinks.each(function () {
        var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
            $elem = $(this),
            $sub = $elem.children('[data-submenu]'),
            subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
            isActive = $sub.hasClass('is-active');
        $elem.attr({
          'aria-controls': subId,
          'aria-expanded': isActive,
          'role': 'menuitem',
          'id': linkId
        });
        $sub.attr({
          'aria-labelledby': linkId,
          'aria-hidden': !isActive,
          'role': 'menu',
          'id': subId
        });
      });
      var initPanes = this.$element.find('.is-active');
      if (initPanes.length) {
        var _this = this;
        initPanes.each(function () {
          _this.down($(this));
        });
      }
      this._events();
    }

    /**
     * Adds event handlers for items within the menu.
     * @private
     */
    _events() {
      var _this = this;

      this.$element.find('li').each(function () {
        var $submenu = $(this).children('[data-submenu]');

        if ($submenu.length) {
          $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
            e.preventDefault();

            _this.toggle($submenu);
          });
        }
      }).on('keydown.zf.accordionmenu', function (e) {
        var $element = $(this),
            $elements = $element.parent('ul').children('li'),
            $prevElement,
            $nextElement,
            $target = $element.children('[data-submenu]');

        $elements.each(function (i) {
          if ($(this).is($element)) {
            $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
            $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

            if ($(this).children('[data-submenu]:visible').length) {
              // has open sub menu
              $nextElement = $element.find('li:first-child').find('a').first();
            }
            if ($(this).is(':first-child')) {
              // is first element of sub menu
              $prevElement = $element.parents('li').first().find('a').first();
            } else if ($prevElement.parents('li').first().children('[data-submenu]:visible').length) {
              // if previous element has open sub menu
              $prevElement = $prevElement.parents('li').find('li:last-child').find('a').first();
            }
            if ($(this).is(':last-child')) {
              // is last element of sub menu
              $nextElement = $element.parents('li').first().next('li').find('a').first();
            }

            return;
          }
        });

        Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
          open: function () {
            if ($target.is(':hidden')) {
              _this.down($target);
              $target.find('li').first().find('a').first().focus();
            }
          },
          close: function () {
            if ($target.length && !$target.is(':hidden')) {
              // close active sub of this item
              _this.up($target);
            } else if ($element.parent('[data-submenu]').length) {
              // close currently open sub
              _this.up($element.parent('[data-submenu]'));
              $element.parents('li').first().find('a').first().focus();
            }
          },
          up: function () {
            $prevElement.focus();
            return true;
          },
          down: function () {
            $nextElement.focus();
            return true;
          },
          toggle: function () {
            if ($element.children('[data-submenu]').length) {
              _this.toggle($element.children('[data-submenu]'));
            }
          },
          closeAll: function () {
            _this.hideAll();
          },
          handled: function (preventDefault) {
            if (preventDefault) {
              e.preventDefault();
            }
            e.stopImmediatePropagation();
          }
        });
      }); //.attr('tabindex', 0);
    }

    /**
     * Closes all panes of the menu.
     * @function
     */
    hideAll() {
      this.$element.find('[data-submenu]').slideUp(this.options.slideSpeed);
    }

    /**
     * Toggles the open/close state of a submenu.
     * @function
     * @param {jQuery} $target - the submenu to toggle
     */
    toggle($target) {
      if (!$target.is(':animated')) {
        if (!$target.is(':hidden')) {
          this.up($target);
        } else {
          this.down($target);
        }
      }
    }

    /**
     * Opens the sub-menu defined by `$target`.
     * @param {jQuery} $target - Sub-menu to open.
     * @fires AccordionMenu#down
     */
    down($target) {
      var _this = this;

      if (!this.options.multiOpen) {
        this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
      }

      $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

      //Foundation.Move(this.options.slideSpeed, $target, function() {
      $target.slideDown(_this.options.slideSpeed, function () {
        /**
         * Fires when the menu is done opening.
         * @event AccordionMenu#down
         */
        _this.$element.trigger('down.zf.accordionMenu', [$target]);
      });
      //});
    }

    /**
     * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
     * @param {jQuery} $target - Sub-menu to close.
     * @fires AccordionMenu#up
     */
    up($target) {
      var _this = this;
      //Foundation.Move(this.options.slideSpeed, $target, function(){
      $target.slideUp(_this.options.slideSpeed, function () {
        /**
         * Fires when the menu is done collapsing up.
         * @event AccordionMenu#up
         */
        _this.$element.trigger('up.zf.accordionMenu', [$target]);
      });
      //});

      var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

      $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
    }

    /**
     * Destroys an instance of accordion menu.
     * @fires AccordionMenu#destroyed
     */
    destroy() {
      this.$element.find('[data-submenu]').slideDown(0).css('display', '');
      this.$element.find('a').off('click.zf.accordionMenu');

      Foundation.Nest.Burn(this.$element, 'accordion');
      Foundation.unregisterPlugin(this);
    }
  }

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @example true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  class Drilldown {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */
    _init() {
      this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
      this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
      this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');

      this._prepareMenu();

      this._keyboardEvents();
    }

    /**
     * prepares drilldown menu by setting attributes to links and elements
     * sets a min height to prevent content jumping
     * wraps the element if not already wrapped
     * @private
     * @function
     */
    _prepareMenu() {
      var _this = this;
      // if(!this.options.holdOpen){
      //   this._menuLinkEvents();
      // }
      this.$submenuAnchors.each(function () {
        var $link = $(this);
        var $sub = $link.parent();
        if (_this.options.parentLink) {
          $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
        }
        $link.data('savedHref', $link.attr('href')).removeAttr('href').attr('tabindex', 0);
        $link.children('[data-submenu]').attr({
          'aria-hidden': true,
          'tabindex': 0,
          'role': 'menu'
        });
        _this._events($link);
      });
      this.$submenus.each(function () {
        var $menu = $(this),
            $back = $menu.find('.js-drilldown-back');
        if (!$back.length) {
          $menu.prepend(_this.options.backButton);
        }
        _this._back($menu);
      });
      if (!this.$element.parent().hasClass('is-drilldown')) {
        this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
        this.$wrapper = this.$element.wrap(this.$wrapper).parent().css(this._getMaxDims());
      }
    }

    /**
     * Adds event handlers to elements in the menu.
     * @function
     * @private
     * @param {jQuery} $elem - the current menu item to add handlers to.
     */
    _events($elem) {
      var _this = this;

      $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
        if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }

        // if(e.target !== e.currentTarget.firstElementChild){
        //   return false;
        // }
        _this._show($elem.parent('li'));

        if (_this.options.closeOnClick) {
          var $body = $('body');
          $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
              return;
            }
            e.preventDefault();
            _this._hideAll();
            $body.off('.zf.drilldown');
          });
        }
      });
    }

    /**
     * Adds keydown event listener to `li`'s in the menu.
     * @private
     */
    _keyboardEvents() {
      var _this = this;

      this.$menuItems.add(this.$element.find('.js-drilldown-back > a')).on('keydown.zf.drilldown', function (e) {

        var $element = $(this),
            $elements = $element.parent('li').parent('ul').children('li').children('a'),
            $prevElement,
            $nextElement;

        $elements.each(function (i) {
          if ($(this).is($element)) {
            $prevElement = $elements.eq(Math.max(0, i - 1));
            $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
            return;
          }
        });

        Foundation.Keyboard.handleKey(e, 'Drilldown', {
          next: function () {
            if ($element.is(_this.$submenuAnchors)) {
              _this._show($element.parent('li'));
              $element.parent('li').one(Foundation.transitionend($element), function () {
                $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
              });
              return true;
            }
          },
          previous: function () {
            _this._hide($element.parent('li').parent('ul'));
            $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
              setTimeout(function () {
                $element.parent('li').parent('ul').parent('li').children('a').first().focus();
              }, 1);
            });
            return true;
          },
          up: function () {
            $prevElement.focus();
            return true;
          },
          down: function () {
            $nextElement.focus();
            return true;
          },
          close: function () {
            _this._back();
            //_this.$menuItems.first().focus(); // focus to first element
          },
          open: function () {
            if (!$element.is(_this.$menuItems)) {
              // not menu item means back button
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            } else if ($element.is(_this.$submenuAnchors)) {
              _this._show($element.parent('li'));
              $element.parent('li').one(Foundation.transitionend($element), function () {
                $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
              });
              return true;
            }
          },
          handled: function (preventDefault) {
            if (preventDefault) {
              e.preventDefault();
            }
            e.stopImmediatePropagation();
          }
        });
      }); // end keyboardAccess
    }

    /**
     * Closes all open elements, and returns to root menu.
     * @function
     * @fires Drilldown#closed
     */
    _hideAll() {
      var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
      $elem.one(Foundation.transitionend($elem), function (e) {
        $elem.removeClass('is-active is-closing');
      });
      /**
       * Fires when the menu is fully closed.
       * @event Drilldown#closed
       */
      this.$element.trigger('closed.zf.drilldown');
    }

    /**
     * Adds event listener for each `back` button, and closes open menus.
     * @function
     * @fires Drilldown#back
     * @param {jQuery} $elem - the current sub-menu to add `back` event.
     */
    _back($elem) {
      var _this = this;
      $elem.off('click.zf.drilldown');
      $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
        e.stopImmediatePropagation();
        // console.log('mouseup on back');
        _this._hide($elem);

        // If there is a parent submenu, call show
        let parentSubMenu = $elem.parent('li').parent('ul').parent('li');
        if (parentSubMenu.length) {
          _this._show(parentSubMenu);
        }
      });
    }

    /**
     * Adds event listener to menu items w/o submenus to close open menus on click.
     * @function
     * @private
     */
    _menuLinkEvents() {
      var _this = this;
      this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
        // e.stopImmediatePropagation();
        setTimeout(function () {
          _this._hideAll();
        }, 0);
      });
    }

    /**
     * Opens a submenu.
     * @function
     * @fires Drilldown#open
     * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
     */
    _show($elem) {
      $elem.attr('aria-expanded', true);
      $elem.children('[data-submenu]').addClass('is-active').attr('aria-hidden', false);
      /**
       * Fires when the submenu has opened.
       * @event Drilldown#open
       */
      this.$element.trigger('open.zf.drilldown', [$elem]);
    }

    /**
     * Hides a submenu
     * @function
     * @fires Drilldown#hide
     * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
     */
    _hide($elem) {
      var _this = this;
      $elem.parent('li').attr('aria-expanded', false);
      $elem.attr('aria-hidden', true).addClass('is-closing').one(Foundation.transitionend($elem), function () {
        $elem.removeClass('is-active is-closing');
        $elem.blur();
      });
      /**
       * Fires when the submenu has closed.
       * @event Drilldown#hide
       */
      $elem.trigger('hide.zf.drilldown', [$elem]);
    }

    /**
     * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
     * Prevents content jumping.
     * @function
     * @private
     */
    _getMaxDims() {
      var biggest = 0;
      var result = {};

      this.$submenus.add(this.$element).each((i, elem) => {
        var height = elem.getBoundingClientRect().height;
        if (height > biggest) biggest = height;
      });

      result['min-height'] = `${ biggest }px`;
      result['max-width'] = `${ this.$element[0].getBoundingClientRect().width }px`;

      return result;
    }

    /**
     * Destroys the Drilldown Menu
     * @function
     */
    destroy() {
      this._hideAll();
      Foundation.Nest.Burn(this.$element, 'drilldown');
      this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
      this.$submenuAnchors.each(function () {
        $(this).off('.zf.drilldown');
      });
      this.$element.find('a').each(function () {
        var $link = $(this);
        $link.removeAttr('tabindex');
        if ($link.data('savedHref')) {
          $link.attr('href', $link.data('savedHref')).removeData('savedHref');
        } else {
          return;
        }
      });
      Foundation.unregisterPlugin(this);
    }
  }

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\li><\a>Back<\/a><\/li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\div class="is-drilldown"><\/div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @example false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @example false
     */
    closeOnClick: false
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  class Dropdown {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close',
        'TAB': 'tab_forward',
        'SHIFT_TAB': 'tab_backward'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */
    _init() {
      var $id = this.$element.attr('id');

      this.$anchor = $(`[data-toggle="${ $id }"]`).length ? $(`[data-toggle="${ $id }"]`) : $(`[data-open="${ $id }"]`);
      this.$anchor.attr({
        'aria-controls': $id,
        'data-is-focus': false,
        'data-yeti-box': $id,
        'aria-haspopup': true,
        'aria-expanded': false

      });

      this.options.positionClass = this.getPositionClass();
      this.counter = 4;
      this.usedPositions = [];
      this.$element.attr({
        'aria-hidden': 'true',
        'data-yeti-box': $id,
        'data-resize': $id,
        'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
      });
      this._events();
    }

    /**
     * Helper function to determine current orientation of dropdown pane.
     * @function
     * @returns {String} position - string value of a position class.
     */
    getPositionClass() {
      var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
      verticalPosition = verticalPosition ? verticalPosition[0] : '';
      var horizontalPosition = /float-(\S+)/.exec(this.$anchor[0].className);
      horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
      var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;

      return position;
    }

    /**
     * Adjusts the dropdown panes orientation by adding/removing positioning classes.
     * @function
     * @private
     * @param {String} position - position class to remove.
     */
    _reposition(position) {
      this.usedPositions.push(position ? position : 'bottom');
      //default, try switching to opposite side
      if (!position && this.usedPositions.indexOf('top') < 0) {
        this.$element.addClass('top');
      } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
        this.$element.removeClass(position);
      } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
        this.$element.removeClass(position).addClass('right');
      } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
        this.$element.removeClass(position).addClass('left');
      }

      //if default change didn't work, try bottom or left first
      else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.$element.addClass('left');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        }
        //if nothing cleared, set to bottom
        else {
            this.$element.removeClass(position);
          }
      this.classChanged = true;
      this.counter--;
    }

    /**
     * Sets the position and orientation of the dropdown pane, checks for collisions.
     * Recursively calls itself if a collision is detected, with a new position class.
     * @function
     * @private
     */
    _setPosition() {
      if (this.$anchor.attr('aria-expanded') === 'false') {
        return false;
      }
      var position = this.getPositionClass(),
          $eleDims = Foundation.Box.GetDimensions(this.$element),
          $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
          _this = this,
          direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
          param = direction === 'top' ? 'height' : 'width',
          offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

      if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element)) {
        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
          'width': $eleDims.windowDims.width - this.options.hOffset * 2,
          'height': 'auto'
        });
        this.classChanged = true;
        return false;
      }

      this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

      while (!Foundation.Box.ImNotTouchingYou(this.$element, false, true) && this.counter) {
        this._reposition(position);
        this._setPosition();
      }
    }

    /**
     * Adds event listeners to the element utilizing the triggers utility library.
     * @function
     * @private
     */
    _events() {
      var _this = this;
      this.$element.on({
        'open.zf.trigger': this.open.bind(this),
        'close.zf.trigger': this.close.bind(this),
        'toggle.zf.trigger': this.toggle.bind(this),
        'resizeme.zf.trigger': this._setPosition.bind(this)
      });

      if (this.options.hover) {
        this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
          if ($('body[data-whatinput="mouse"]').is('*')) {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.open();
              _this.$anchor.data('hover', true);
            }, _this.options.hoverDelay);
          }
        }).on('mouseleave.zf.dropdown', function () {
          clearTimeout(_this.timeout);
          _this.timeout = setTimeout(function () {
            _this.close();
            _this.$anchor.data('hover', false);
          }, _this.options.hoverDelay);
        });
        if (this.options.hoverPane) {
          this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            clearTimeout(_this.timeout);
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
        }
      }
      this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

        var $target = $(this),
            visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

        Foundation.Keyboard.handleKey(e, 'Dropdown', {
          tab_forward: function () {
            if (_this.$element.find(':focus').is(visibleFocusableElements.eq(-1))) {
              // left modal downwards, setting focus to first element
              if (_this.options.trapFocus) {
                // if focus shall be trapped
                visibleFocusableElements.eq(0).focus();
                e.preventDefault();
              } else {
                // if focus is not trapped, close dropdown on focus out
                _this.close();
              }
            }
          },
          tab_backward: function () {
            if (_this.$element.find(':focus').is(visibleFocusableElements.eq(0)) || _this.$element.is(':focus')) {
              // left modal upwards, setting focus to last element
              if (_this.options.trapFocus) {
                // if focus shall be trapped
                visibleFocusableElements.eq(-1).focus();
                e.preventDefault();
              } else {
                // if focus is not trapped, close dropdown on focus out
                _this.close();
              }
            }
          },
          open: function () {
            if ($target.is(_this.$anchor)) {
              _this.open();
              _this.$element.attr('tabindex', -1).focus();
              e.preventDefault();
            }
          },
          close: function () {
            _this.close();
            _this.$anchor.focus();
          }
        });
      });
    }

    /**
     * Adds an event handler to the body to close any dropdowns on a click.
     * @function
     * @private
     */
    _addBodyHandler() {
      var $body = $(document.body).not(this.$element),
          _this = this;
      $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
        if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
          return;
        }
        if (_this.$element.find(e.target).length) {
          return;
        }
        _this.close();
        $body.off('click.zf.dropdown');
      });
    }

    /**
     * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
     * @function
     * @fires Dropdown#closeme
     * @fires Dropdown#show
     */
    open() {
      // var _this = this;
      /**
       * Fires to close other open dropdowns
       * @event Dropdown#closeme
       */
      this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
      this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
      // this.$element/*.show()*/;
      this._setPosition();
      this.$element.addClass('is-open').attr({ 'aria-hidden': false });

      if (this.options.autoFocus) {
        var $focusable = Foundation.Keyboard.findFocusable(this.$element);
        if ($focusable.length) {
          $focusable.eq(0).focus();
        }
      }

      if (this.options.closeOnClick) {
        this._addBodyHandler();
      }

      /**
       * Fires once the dropdown is visible.
       * @event Dropdown#show
       */
      this.$element.trigger('show.zf.dropdown', [this.$element]);
    }

    /**
     * Closes the open dropdown pane.
     * @function
     * @fires Dropdown#hide
     */
    close() {
      if (!this.$element.hasClass('is-open')) {
        return false;
      }
      this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

      this.$anchor.removeClass('hover').attr('aria-expanded', false);

      if (this.classChanged) {
        var curPositionClass = this.getPositionClass();
        if (curPositionClass) {
          this.$element.removeClass(curPositionClass);
        }
        this.$element.addClass(this.options.positionClass)
        /*.hide()*/.css({ height: '', width: '' });
        this.classChanged = false;
        this.counter = 4;
        this.usedPositions.length = 0;
      }
      this.$element.trigger('hide.zf.dropdown', [this.$element]);
    }

    /**
     * Toggles the dropdown pane's visibility.
     * @function
     */
    toggle() {
      if (this.$element.hasClass('is-open')) {
        if (this.$anchor.data('hover')) return;
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * Destroys the dropdown.
     * @function
     */
    destroy() {
      this.$element.off('.zf.trigger').hide();
      this.$anchor.off('.zf.dropdown');

      Foundation.unregisterPlugin(this);
    }
  }

  Dropdown.defaults = {
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @example false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @example true
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @example false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @example true
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @example false
     */
    closeOnClick: false
  };

  // Window exports
  Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  class DropdownMenu {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */
    _init() {
      var subs = this.$element.find('li.is-dropdown-submenu-parent');
      this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

      this.$menuItems = this.$element.find('[role="menuitem"]');
      this.$tabs = this.$element.children('[role="menuitem"]');
      this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

      if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
        this.options.alignment = 'right';
        subs.addClass('opens-left');
      } else {
        subs.addClass('opens-right');
      }
      this.changed = false;
      this._events();
    }

    _isVertical() {
      return this.$tabs.css('display') === 'block';
    }

    /**
     * Adds event listeners to elements within the menu
     * @private
     * @function
     */
    _events() {
      var _this = this,
          hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
          parClass = 'is-dropdown-submenu-parent';

      // used for onClick and in the keyboard handlers
      var handleClickFn = function (e) {
        var $elem = $(e.target).parentsUntil('ul', `.${ parClass }`),
            hasSub = $elem.hasClass(parClass),
            hasClicked = $elem.attr('data-is-click') === 'true',
            $sub = $elem.children('.is-dropdown-submenu');

        if (hasSub) {
          if (hasClicked) {
            if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
              return;
            } else {
              e.stopImmediatePropagation();
              e.preventDefault();
              _this._hide($elem);
            }
          } else {
            e.preventDefault();
            e.stopImmediatePropagation();
            _this._show($sub);
            $elem.add($elem.parentsUntil(_this.$element, `.${ parClass }`)).attr('data-is-click', true);
          }
        } else {
          if (_this.options.closeOnClickInside) {
            _this._hide($elem);
          }
          return;
        }
      };

      if (this.options.clickOpen || hasTouch) {
        this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
      }

      if (!this.options.disableHover) {
        this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
          var $elem = $(this),
              hasSub = $elem.hasClass(parClass);

          if (hasSub) {
            clearTimeout(_this.delay);
            _this.delay = setTimeout(function () {
              _this._show($elem.children('.is-dropdown-submenu'));
            }, _this.options.hoverDelay);
          }
        }).on('mouseleave.zf.dropdownmenu', function (e) {
          var $elem = $(this),
              hasSub = $elem.hasClass(parClass);
          if (hasSub && _this.options.autoclose) {
            if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
              return false;
            }

            clearTimeout(_this.delay);
            _this.delay = setTimeout(function () {
              _this._hide($elem);
            }, _this.options.closingTime);
          }
        });
      }
      this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
        var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
            isTab = _this.$tabs.index($element) > -1,
            $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
            $prevElement,
            $nextElement;

        $elements.each(function (i) {
          if ($(this).is($element)) {
            $prevElement = $elements.eq(i - 1);
            $nextElement = $elements.eq(i + 1);
            return;
          }
        });

        var nextSibling = function () {
          if (!$element.is(':last-child')) {
            $nextElement.children('a:first').focus();
            e.preventDefault();
          }
        },
            prevSibling = function () {
          $prevElement.children('a:first').focus();
          e.preventDefault();
        },
            openSub = function () {
          var $sub = $element.children('ul.is-dropdown-submenu');
          if ($sub.length) {
            _this._show($sub);
            $element.find('li > a:first').focus();
            e.preventDefault();
          } else {
            return;
          }
        },
            closeSub = function () {
          //if ($element.is(':first-child')) {
          var close = $element.parent('ul').parent('li');
          close.children('a:first').focus();
          _this._hide(close);
          e.preventDefault();
          //}
        };
        var functions = {
          open: openSub,
          close: function () {
            _this._hide(_this.$element);
            _this.$menuItems.find('a:first').focus(); // focus to first element
            e.preventDefault();
          },
          handled: function () {
            e.stopImmediatePropagation();
          }
        };

        if (isTab) {
          if (_this._isVertical()) {
            // vertical menu
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                down: nextSibling,
                up: prevSibling,
                next: closeSub,
                previous: openSub
              });
            } else {
              // left aligned
              $.extend(functions, {
                down: nextSibling,
                up: prevSibling,
                next: openSub,
                previous: closeSub
              });
            }
          } else {
            // horizontal menu
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                next: prevSibling,
                previous: nextSibling,
                down: openSub,
                up: closeSub
              });
            } else {
              // left aligned
              $.extend(functions, {
                next: nextSibling,
                previous: prevSibling,
                down: openSub,
                up: closeSub
              });
            }
          }
        } else {
          // not tabs -> one sub
          if (Foundation.rtl()) {
            // right aligned
            $.extend(functions, {
              next: closeSub,
              previous: openSub,
              down: nextSibling,
              up: prevSibling
            });
          } else {
            // left aligned
            $.extend(functions, {
              next: openSub,
              previous: closeSub,
              down: nextSibling,
              up: prevSibling
            });
          }
        }
        Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
      });
    }

    /**
     * Adds an event handler to the body to close any dropdowns on a click.
     * @function
     * @private
     */
    _addBodyHandler() {
      var $body = $(document.body),
          _this = this;
      $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
        var $link = _this.$element.find(e.target);
        if ($link.length) {
          return;
        }

        _this._hide();
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
      });
    }

    /**
     * Opens a dropdown pane, and checks for collisions first.
     * @param {jQuery} $sub - ul element that is a submenu to show
     * @function
     * @private
     * @fires DropdownMenu#show
     */
    _show($sub) {
      var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
        return $(el).find($sub).length > 0;
      }));
      var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
      this._hide($sibs, idx);
      $sub.css('visibility', 'hidden').addClass('js-dropdown-active').attr({ 'aria-hidden': false }).parent('li.is-dropdown-submenu-parent').addClass('is-active').attr({ 'aria-expanded': true });
      var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
      if (!clear) {
        var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
            $parentLi = $sub.parent('.is-dropdown-submenu-parent');
        $parentLi.removeClass(`opens${ oldClass }`).addClass(`opens-${ this.options.alignment }`);
        clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          $parentLi.removeClass(`opens-${ this.options.alignment }`).addClass('opens-inner');
        }
        this.changed = true;
      }
      $sub.css('visibility', '');
      if (this.options.closeOnClick) {
        this._addBodyHandler();
      }
      /**
       * Fires when the new dropdown pane is visible.
       * @event DropdownMenu#show
       */
      this.$element.trigger('show.zf.dropdownmenu', [$sub]);
    }

    /**
     * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
     * @function
     * @param {jQuery} $elem - element with a submenu to hide
     * @param {Number} idx - index of the $tabs collection to hide
     * @private
     */
    _hide($elem, idx) {
      var $toClose;
      if ($elem && $elem.length) {
        $toClose = $elem;
      } else if (idx !== undefined) {
        $toClose = this.$tabs.not(function (i, el) {
          return i === idx;
        });
      } else {
        $toClose = this.$element;
      }
      var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

      if (somethingToClose) {
        $toClose.find('li.is-active').add($toClose).attr({
          'aria-expanded': false,
          'data-is-click': false
        }).removeClass('is-active');

        $toClose.find('ul.js-dropdown-active').attr({
          'aria-hidden': true
        }).removeClass('js-dropdown-active');

        if (this.changed || $toClose.find('opens-inner').length) {
          var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
          $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass(`opens-inner opens-${ this.options.alignment }`).addClass(`opens-${ oldClass }`);
          this.changed = false;
        }
        /**
         * Fires when the open menus are closed.
         * @event DropdownMenu#hide
         */
        this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
      }
    }

    /**
     * Destroys the plugin.
     * @function
     */
    destroy() {
      this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
      $(document.body).off('.zf.dropdownmenu');
      Foundation.Nest.Burn(this.$element, 'dropdown');
      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @example true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @example true
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @example 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS.
     * @option
     * @example 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allow clicks on leaf anchor links to close any open submenus.
     * @option
     * @example true
     */
    closeOnClickInside: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @example 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @example 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @example false
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader if equalizer contains images
   */

  class Equalizer {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */
    _init() {
      var eqId = this.$element.attr('data-equalizer') || '';
      var $watched = this.$element.find(`[data-equalizer-watch="${ eqId }"]`);

      this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
      this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));

      this.hasNested = this.$element.find('[data-equalizer]').length > 0;
      this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
      this.isOn = false;
      this._bindHandler = {
        onResizeMeBound: this._onResizeMe.bind(this),
        onPostEqualizedBound: this._onPostEqualized.bind(this)
      };

      var imgs = this.$element.find('img');
      var tooSmall;
      if (this.options.equalizeOn) {
        tooSmall = this._checkMQ();
        $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
      } else {
        this._events();
      }
      if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
        if (imgs.length) {
          Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
        } else {
          this._reflow();
        }
      }
    }

    /**
     * Removes event listeners if the breakpoint is too small.
     * @private
     */
    _pauseEvents() {
      this.isOn = false;
      this.$element.off({
        '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
        'resizeme.zf.trigger': this._bindHandler.onResizeMeBound
      });
    }

    /**
     * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
     * @private
     */
    _onResizeMe(e) {
      this._reflow();
    }

    /**
     * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
     * @private
     */
    _onPostEqualized(e) {
      if (e.target !== this.$element[0]) {
        this._reflow();
      }
    }

    /**
     * Initializes events for Equalizer.
     * @private
     */
    _events() {
      var _this = this;
      this._pauseEvents();
      if (this.hasNested) {
        this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
      } else {
        this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
      }
      this.isOn = true;
    }

    /**
     * Checks the current breakpoint to the minimum required size.
     * @private
     */
    _checkMQ() {
      var tooSmall = !Foundation.MediaQuery.atLeast(this.options.equalizeOn);
      if (tooSmall) {
        if (this.isOn) {
          this._pauseEvents();
          this.$watched.css('height', 'auto');
        }
      } else {
        if (!this.isOn) {
          this._events();
        }
      }
      return tooSmall;
    }

    /**
     * A noop version for the plugin
     * @private
     */
    _killswitch() {
      return;
    }

    /**
     * Calls necessary functions to update Equalizer upon DOM change
     * @private
     */
    _reflow() {
      if (!this.options.equalizeOnStack) {
        if (this._isStacked()) {
          this.$watched.css('height', 'auto');
          return false;
        }
      }
      if (this.options.equalizeByRow) {
        this.getHeightsByRow(this.applyHeightByRow.bind(this));
      } else {
        this.getHeights(this.applyHeight.bind(this));
      }
    }

    /**
     * Manually determines if the first 2 elements are *NOT* stacked.
     * @private
     */
    _isStacked() {
      return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
    }

    /**
     * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
     * @param {Function} cb - A non-optional callback to return the heights array to.
     * @returns {Array} heights - An array of heights of children within Equalizer container
     */
    getHeights(cb) {
      var heights = [];
      for (var i = 0, len = this.$watched.length; i < len; i++) {
        this.$watched[i].style.height = 'auto';
        heights.push(this.$watched[i].offsetHeight);
      }
      cb(heights);
    }

    /**
     * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
     * @param {Function} cb - A non-optional callback to return the heights array to.
     * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
     */
    getHeightsByRow(cb) {
      var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
          groups = [],
          group = 0;
      //group by Row
      groups[group] = [];
      for (var i = 0, len = this.$watched.length; i < len; i++) {
        this.$watched[i].style.height = 'auto';
        //maybe could use this.$watched[i].offsetTop
        var elOffsetTop = $(this.$watched[i]).offset().top;
        if (elOffsetTop != lastElTopOffset) {
          group++;
          groups[group] = [];
          lastElTopOffset = elOffsetTop;
        }
        groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
      }

      for (var j = 0, ln = groups.length; j < ln; j++) {
        var heights = $(groups[j]).map(function () {
          return this[1];
        }).get();
        var max = Math.max.apply(null, heights);
        groups[j].push(max);
      }
      cb(groups);
    }

    /**
     * Changes the CSS height property of each child in an Equalizer parent to match the tallest
     * @param {array} heights - An array of heights of children within Equalizer container
     * @fires Equalizer#preequalized
     * @fires Equalizer#postequalized
     */
    applyHeight(heights) {
      var max = Math.max.apply(null, heights);
      /**
       * Fires before the heights are applied
       * @event Equalizer#preequalized
       */
      this.$element.trigger('preequalized.zf.equalizer');

      this.$watched.css('height', max);

      /**
       * Fires when the heights have been applied
       * @event Equalizer#postequalized
       */
      this.$element.trigger('postequalized.zf.equalizer');
    }

    /**
     * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
     * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
     * @fires Equalizer#preequalized
     * @fires Equalizer#preequalizedRow
     * @fires Equalizer#postequalizedRow
     * @fires Equalizer#postequalized
     */
    applyHeightByRow(groups) {
      /**
       * Fires before the heights are applied
       */
      this.$element.trigger('preequalized.zf.equalizer');
      for (var i = 0, len = groups.length; i < len; i++) {
        var groupsILength = groups[i].length,
            max = groups[i][groupsILength - 1];
        if (groupsILength <= 2) {
          $(groups[i][0][0]).css({ 'height': 'auto' });
          continue;
        }
        /**
          * Fires before the heights per row are applied
          * @event Equalizer#preequalizedRow
          */
        this.$element.trigger('preequalizedrow.zf.equalizer');
        for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
          $(groups[i][j][0]).css({ 'height': max });
        }
        /**
          * Fires when the heights per row have been applied
          * @event Equalizer#postequalizedRow
          */
        this.$element.trigger('postequalizedrow.zf.equalizer');
      }
      /**
       * Fires when the heights have been applied
       */
      this.$element.trigger('postequalized.zf.equalizer');
    }

    /**
     * Destroys an instance of Equalizer.
     * @function
     */
    destroy() {
      this._pauseEvents();
      this.$watched.css('height', 'auto');

      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @example true
     */
    equalizeOnStack: false,
    /**
     * Enable height equalization row by row.
     * @option
     * @example false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @example 'medium'
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  class Interchange {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */
    _init() {
      this._addBreakpoints();
      this._generateRules();
      this._reflow();
    }

    /**
     * Initializes events for Interchange.
     * @function
     * @private
     */
    _events() {
      $(window).on('resize.zf.interchange', Foundation.util.throttle(this._reflow.bind(this), 50));
    }

    /**
     * Calls necessary functions to update Interchange upon DOM change
     * @function
     * @private
     */
    _reflow() {
      var match;

      // Iterate through each rule, but only save the last match
      for (var i in this.rules) {
        if (this.rules.hasOwnProperty(i)) {
          var rule = this.rules[i];

          if (window.matchMedia(rule.query).matches) {
            match = rule;
          }
        }
      }

      if (match) {
        this.replace(match.path);
      }
    }

    /**
     * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
     * @function
     * @private
     */
    _addBreakpoints() {
      for (var i in Foundation.MediaQuery.queries) {
        if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
          var query = Foundation.MediaQuery.queries[i];
          Interchange.SPECIAL_QUERIES[query.name] = query.value;
        }
      }
    }

    /**
     * Checks the Interchange element for the provided media query + content pairings
     * @function
     * @private
     * @param {Object} element - jQuery object that is an Interchange instance
     * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
     */
    _generateRules(element) {
      var rulesList = [];
      var rules;

      if (this.options.rules) {
        rules = this.options.rules;
      } else {
        rules = this.$element.data('interchange').match(/\[.*?\]/g);
      }

      for (var i in rules) {
        if (rules.hasOwnProperty(i)) {
          var rule = rules[i].slice(1, -1).split(', ');
          var path = rule.slice(0, -1).join('');
          var query = rule[rule.length - 1];

          if (Interchange.SPECIAL_QUERIES[query]) {
            query = Interchange.SPECIAL_QUERIES[query];
          }

          rulesList.push({
            path: path,
            query: query
          });
        }
      }

      this.rules = rulesList;
    }

    /**
     * Update the `src` property of an image, or change the HTML of a container, to the specified path.
     * @function
     * @param {String} path - Path to the image or HTML partial.
     * @fires Interchange#replaced
     */
    replace(path) {
      if (this.currentPath === path) return;

      var _this = this,
          trigger = 'replaced.zf.interchange';

      // Replacing images
      if (this.$element[0].nodeName === 'IMG') {
        this.$element.attr('src', path).on('load', function () {
          _this.currentPath = path;
        }).trigger(trigger);
      }
      // Replacing background images
      else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
          this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
        }
        // Replacing HTML
        else {
            $.get(path, function (response) {
              _this.$element.html(response).trigger(trigger);
              $(response).foundation();
              _this.currentPath = path;
            });
          }

      /**
       * Fires when content in an Interchange element is done being loaded.
       * @event Interchange#replaced
       */
      // this.$element.trigger('replaced.zf.interchange');
    }

    /**
     * Destroys an instance of interchange.
     * @function
     */
    destroy() {
      //TODO this.
    }
  }

  /**
   * Default settings for plugin
   */
  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  class Magellan {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */
    _init() {
      var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
      var _this = this;
      this.$targets = $('[data-magellan-target]');
      this.$links = this.$element.find('a');
      this.$element.attr({
        'data-resize': id,
        'data-scroll': id,
        'id': id
      });
      this.$active = $();
      this.scrollPos = parseInt(window.pageYOffset, 10);

      this._events();
    }

    /**
     * Calculates an array of pixel values that are the demarcation lines between locations on the page.
     * Can be invoked if new elements are added or the size of a location changes.
     * @function
     */
    calcPoints() {
      var _this = this,
          body = document.body,
          html = document.documentElement;

      this.points = [];
      this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
      this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

      this.$targets.each(function () {
        var $tar = $(this),
            pt = Math.round($tar.offset().top - _this.options.threshold);
        $tar.targetPoint = pt;
        _this.points.push(pt);
      });
    }

    /**
     * Initializes events for Magellan.
     * @private
     */
    _events() {
      var _this = this,
          $body = $('html, body'),
          opts = {
        duration: _this.options.animationDuration,
        easing: _this.options.animationEasing
      };
      $(window).one('load', function () {
        if (_this.options.deepLinking) {
          if (location.hash) {
            _this.scrollToLoc(location.hash);
          }
        }
        _this.calcPoints();
        _this._updateActive();
      });

      this.$element.on({
        'resizeme.zf.trigger': this.reflow.bind(this),
        'scrollme.zf.trigger': this._updateActive.bind(this)
      }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
        e.preventDefault();
        var arrival = this.getAttribute('href');
        _this.scrollToLoc(arrival);
      });
    }

    /**
     * Function to scroll to a given location on the page.
     * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
     * @function
     */
    scrollToLoc(loc) {
      // Do nothing if target does not exist to prevent errors
      if (!$(loc).length) {
        return false;
      }
      var scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

      $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing);
    }

    /**
     * Calls necessary functions to update Magellan upon DOM change
     * @function
     */
    reflow() {
      this.calcPoints();
      this._updateActive();
    }

    /**
     * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
     * @private
     * @function
     * @fires Magellan#update
     */
    _updateActive() /*evt, elem, scrollPos*/{
      var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
          curIdx;

      if (winPos + this.winHeight === this.docHeight) {
        curIdx = this.points.length - 1;
      } else if (winPos < this.points[0]) {
        curIdx = 0;
      } else {
        var isDown = this.scrollPos < winPos,
            _this = this,
            curVisible = this.points.filter(function (p, i) {
          return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
        });
        curIdx = curVisible.length ? curVisible.length - 1 : 0;
      }

      this.$active.removeClass(this.options.activeClass);
      this.$active = this.$links.filter('[href="#' + this.$targets.eq(curIdx).data('magellan-target') + '"]').addClass(this.options.activeClass);

      if (this.options.deepLinking) {
        var hash = this.$active[0].getAttribute('href');
        if (window.history.pushState) {
          window.history.pushState(null, null, hash);
        } else {
          window.location.hash = hash;
        }
      }

      this.scrollPos = winPos;
      /**
       * Fires when magellan is finished updating to the new active element.
       * @event Magellan#update
       */
      this.$element.trigger('update.zf.magellan', [this.$active]);
    }

    /**
     * Destroys an instance of Magellan and resets the url of the window.
     * @function
     */
    destroy() {
      this.$element.off('.zf.trigger .zf.magellan').find(`.${ this.options.activeClass }`).removeClass(this.options.activeClass);

      if (this.options.deepLinking) {
        var hash = this.$active[0].getAttribute('href');
        window.location.hash.replace(hash, '');
      }

      Foundation.unregisterPlugin(this);
    }
  }

  /**
   * Default settings for plugin
   */
  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations.
     * @option
     * @example 'ease-in-out'
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @example 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @example 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @example true
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @example 25
     */
    barOffset: 0
  };

  // Window exports
  Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  class OffCanvas {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */
    _init() {
      var id = this.$element.attr('id');

      this.$element.attr('aria-hidden', 'true');

      // Find triggers that affect this element and add aria-expanded to them
      this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

      // Add a close trigger over the body if necessary
      if (this.options.closeOnClick) {
        if ($('.js-off-canvas-exit').length) {
          this.$exiter = $('.js-off-canvas-exit');
        } else {
          var exiter = document.createElement('div');
          exiter.setAttribute('class', 'js-off-canvas-exit');
          $('[data-off-canvas-content]').append(exiter);

          this.$exiter = $(exiter);
        }
      }

      this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

      if (this.options.isRevealed) {
        this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
        this._setMQChecker();
      }
      if (!this.options.transitionTime) {
        this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas-wrapper]')[0]).transitionDuration) * 1000;
      }
    }

    /**
     * Adds event handlers to the off-canvas wrapper and the exit overlay.
     * @function
     * @private
     */
    _events() {
      this.$element.off('.zf.trigger .zf.offcanvas').on({
        'open.zf.trigger': this.open.bind(this),
        'close.zf.trigger': this.close.bind(this),
        'toggle.zf.trigger': this.toggle.bind(this),
        'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
      });

      if (this.options.closeOnClick && this.$exiter.length) {
        this.$exiter.on({ 'click.zf.offcanvas': this.close.bind(this) });
      }
    }

    /**
     * Applies event listener for elements that will reveal at certain breakpoints.
     * @private
     */
    _setMQChecker() {
      var _this = this;

      $(window).on('changed.zf.mediaquery', function () {
        if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
          _this.reveal(true);
        } else {
          _this.reveal(false);
        }
      }).one('load.zf.offcanvas', function () {
        if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
          _this.reveal(true);
        }
      });
    }

    /**
     * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
     * @param {Boolean} isRevealed - true if element should be revealed.
     * @function
     */
    reveal(isRevealed) {
      var $closer = this.$element.find('[data-close]');
      if (isRevealed) {
        this.close();
        this.isRevealed = true;
        // if (!this.options.forceTop) {
        //   var scrollPos = parseInt(window.pageYOffset);
        //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
        // }
        // if (this.options.isSticky) { this._stick(); }
        this.$element.off('open.zf.trigger toggle.zf.trigger');
        if ($closer.length) {
          $closer.hide();
        }
      } else {
        this.isRevealed = false;
        // if (this.options.isSticky || !this.options.forceTop) {
        //   this.$element[0].style.transform = '';
        //   $(window).off('scroll.zf.offcanvas');
        // }
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this)
        });
        if ($closer.length) {
          $closer.show();
        }
      }
    }

    /**
     * Opens the off-canvas menu.
     * @function
     * @param {Object} event - Event object passed from listener.
     * @param {jQuery} trigger - element that triggered the off-canvas to open.
     * @fires OffCanvas#opened
     */
    open(event, trigger) {
      if (this.$element.hasClass('is-open') || this.isRevealed) {
        return;
      }
      var _this = this,
          $body = $(document.body);

      if (this.options.forceTop) {
        $('body').scrollTop(0);
      }
      // window.pageYOffset = 0;

      // if (!this.options.forceTop) {
      //   var scrollPos = parseInt(window.pageYOffset);
      //   this.$element[0].style.transform = 'translate(0,' + scrollPos + 'px)';
      //   if (this.$exiter.length) {
      //     this.$exiter[0].style.transform = 'translate(0,' + scrollPos + 'px)';
      //   }
      // }
      /**
       * Fires when the off-canvas menu opens.
       * @event OffCanvas#opened
       */

      var $wrapper = $('[data-off-canvas-wrapper]');
      $wrapper.addClass('is-off-canvas-open is-open-' + _this.options.position);

      _this.$element.addClass('is-open');

      // if (_this.options.isSticky) {
      //   _this._stick();
      // }

      this.$triggers.attr('aria-expanded', 'true');
      this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

      if (this.options.closeOnClick) {
        this.$exiter.addClass('is-visible');
      }

      if (trigger) {
        this.$lastTrigger = trigger;
      }

      if (this.options.autoFocus) {
        $wrapper.one(Foundation.transitionend($wrapper), function () {
          if (_this.$element.hasClass('is-open')) {
            // handle double clicks
            _this.$element.attr('tabindex', '-1');
            _this.$element.focus();
          }
        });
      }

      if (this.options.trapFocus) {
        $wrapper.one(Foundation.transitionend($wrapper), function () {
          if (_this.$element.hasClass('is-open')) {
            // handle double clicks
            _this.$element.attr('tabindex', '-1');
            _this.trapFocus();
          }
        });
      }
    }

    /**
     * Traps focus within the offcanvas on open.
     * @private
     */
    _trapFocus() {
      var focusable = Foundation.Keyboard.findFocusable(this.$element),
          first = focusable.eq(0),
          last = focusable.eq(-1);

      focusable.off('.zf.offcanvas').on('keydown.zf.offcanvas', function (e) {
        var key = Foundation.Keyboard.parseKey(e);
        if (key === 'TAB' && e.target === last[0]) {
          e.preventDefault();
          first.focus();
        }
        if (key === 'SHIFT_TAB' && e.target === first[0]) {
          e.preventDefault();
          last.focus();
        }
      });
    }

    /**
     * Allows the offcanvas to appear sticky utilizing translate properties.
     * @private
     */
    // OffCanvas.prototype._stick = function() {
    //   var elStyle = this.$element[0].style;
    //
    //   if (this.options.closeOnClick) {
    //     var exitStyle = this.$exiter[0].style;
    //   }
    //
    //   $(window).on('scroll.zf.offcanvas', function(e) {
    //     console.log(e);
    //     var pageY = window.pageYOffset;
    //     elStyle.transform = 'translate(0,' + pageY + 'px)';
    //     if (exitStyle !== undefined) { exitStyle.transform = 'translate(0,' + pageY + 'px)'; }
    //   });
    //   // this.$element.trigger('stuck.zf.offcanvas');
    // };
    /**
     * Closes the off-canvas menu.
     * @function
     * @param {Function} cb - optional cb to fire after closure.
     * @fires OffCanvas#closed
     */
    close(cb) {
      if (!this.$element.hasClass('is-open') || this.isRevealed) {
        return;
      }

      var _this = this;

      //  Foundation.Move(this.options.transitionTime, this.$element, function() {
      $('[data-off-canvas-wrapper]').removeClass(`is-off-canvas-open is-open-${ _this.options.position }`);
      _this.$element.removeClass('is-open');
      // Foundation._reflow();
      // });
      this.$element.attr('aria-hidden', 'true')
      /**
       * Fires when the off-canvas menu opens.
       * @event OffCanvas#closed
       */
      .trigger('closed.zf.offcanvas');
      // if (_this.options.isSticky || !_this.options.forceTop) {
      //   setTimeout(function() {
      //     _this.$element[0].style.transform = '';
      //     $(window).off('scroll.zf.offcanvas');
      //   }, this.options.transitionTime);
      // }
      if (this.options.closeOnClick) {
        this.$exiter.removeClass('is-visible');
      }

      this.$triggers.attr('aria-expanded', 'false');
      if (this.options.trapFocus) {
        $('[data-off-canvas-content]').removeAttr('tabindex');
      }
    }

    /**
     * Toggles the off-canvas menu open or closed.
     * @function
     * @param {Object} event - Event object passed from listener.
     * @param {jQuery} trigger - element that triggered the off-canvas to open.
     */
    toggle(event, trigger) {
      if (this.$element.hasClass('is-open')) {
        this.close(event, trigger);
      } else {
        this.open(event, trigger);
      }
    }

    /**
     * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
     * @function
     * @private
     */
    _handleKeyboard(e) {
      Foundation.Keyboard.handleKey(e, 'OffCanvas', {
        close: () => {
          this.close();
          this.$lastTrigger.focus();
          return true;
        },
        handled: () => {
          e.stopPropagation();
          e.preventDefault();
        }
      });
    }

    /**
     * Destroys the offcanvas plugin.
     * @function
     */
    destroy() {
      this.close();
      this.$element.off('.zf.trigger .zf.offcanvas');
      this.$exiter.off('.zf.offcanvas');

      Foundation.unregisterPlugin(this);
    }
  }

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @example true
     */
    closeOnClick: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @example 500
     */
    transitionTime: 0,

    /**
     * Direction the offcanvas opens from. Determines class applied to body.
     * @option
     * @example left
     */
    position: 'left',

    /**
     * Force the page to scroll to top on open.
     * @option
     * @example true
     */
    forceTop: true,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @example false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @example reveal-for-large
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * TODO improve the regex testing for this.
     * @example reveal-for-large
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  class Orbit {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */
    _init() {
      this.$wrapper = this.$element.find(`.${ this.options.containerClass }`);
      this.$slides = this.$element.find(`.${ this.options.slideClass }`);
      var $images = this.$element.find('img'),
          initActive = this.$slides.filter('.is-active');

      if (!initActive.length) {
        this.$slides.eq(0).addClass('is-active');
      }

      if (!this.options.useMUI) {
        this.$slides.addClass('no-motionui');
      }

      if ($images.length) {
        Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
      } else {
        this._prepareForOrbit(); //hehe
      }

      if (this.options.bullets) {
        this._loadBullets();
      }

      this._events();

      if (this.options.autoPlay && this.$slides.length > 1) {
        this.geoSync();
      }

      if (this.options.accessible) {
        // allow wrapper to be focusable to enable arrow navigation
        this.$wrapper.attr('tabindex', 0);
      }
    }

    /**
    * Creates a jQuery collection of bullets, if they are being used.
    * @function
    * @private
    */
    _loadBullets() {
      this.$bullets = this.$element.find(`.${ this.options.boxOfBullets }`).find('button');
    }

    /**
    * Sets a `timer` object on the orbit, and starts the counter for the next slide.
    * @function
    */
    geoSync() {
      var _this = this;
      this.timer = new Foundation.Timer(this.$element, {
        duration: this.options.timerDelay,
        infinite: false
      }, function () {
        _this.changeSlide(true);
      });
      this.timer.start();
    }

    /**
    * Sets wrapper and slide heights for the orbit.
    * @function
    * @private
    */
    _prepareForOrbit() {
      var _this = this;
      this._setWrapperHeight(function (max) {
        _this._setSlideHeight(max);
      });
    }

    /**
    * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
    * @function
    * @private
    * @param {Function} cb - a callback function to fire when complete.
    */
    _setWrapperHeight(cb) {
      //rewrite this to `for` loop
      var max = 0,
          temp,
          counter = 0;

      this.$slides.each(function () {
        temp = this.getBoundingClientRect().height;
        $(this).attr('data-slide', counter);

        if (counter) {
          //if not the first slide, set css position and display property
          $(this).css({ 'position': 'relative', 'display': 'none' });
        }
        max = temp > max ? temp : max;
        counter++;
      });

      if (counter === this.$slides.length) {
        this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
        cb(max); //fire callback with max height dimension.
      }
    }

    /**
    * Sets the max-height of each slide.
    * @function
    * @private
    */
    _setSlideHeight(height) {
      this.$slides.each(function () {
        $(this).css('max-height', height);
      });
    }

    /**
    * Adds event listeners to basically everything within the element.
    * @function
    * @private
    */
    _events() {
      var _this = this;

      //***************************************
      //**Now using custom event - thanks to:**
      //**      Yohai Ararat of Toronto      **
      //***************************************
      if (this.$slides.length > 1) {

        if (this.options.swipe) {
          this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
            e.preventDefault();
            _this.changeSlide(true);
          }).on('swiperight.zf.orbit', function (e) {
            e.preventDefault();
            _this.changeSlide(false);
          });
        }
        //***************************************

        if (this.options.autoPlay) {
          this.$slides.on('click.zf.orbit', function () {
            _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
            _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
          });

          if (this.options.pauseOnHover) {
            this.$element.on('mouseenter.zf.orbit', function () {
              _this.timer.pause();
            }).on('mouseleave.zf.orbit', function () {
              if (!_this.$element.data('clickedOn')) {
                _this.timer.start();
              }
            });
          }
        }

        if (this.options.navButtons) {
          var $controls = this.$element.find(`.${ this.options.nextClass }, .${ this.options.prevClass }`);
          $controls.attr('tabindex', 0)
          //also need to handle enter/return and spacebar key presses
          .on('click.zf.orbit touchend.zf.orbit', function (e) {
            e.preventDefault();
            _this.changeSlide($(this).hasClass(_this.options.nextClass));
          });
        }

        if (this.options.bullets) {
          this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
            if (/is-active/g.test(this.className)) {
              return false;
            } //if this is active, kick out of function.
            var idx = $(this).data('slide'),
                ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                $slide = _this.$slides.eq(idx);

            _this.changeSlide(ltr, $slide, idx);
          });
        }

        if (this.options.accessible) {
          this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
            // handle keyboard event with keyboard util
            Foundation.Keyboard.handleKey(e, 'Orbit', {
              next: function () {
                _this.changeSlide(true);
              },
              previous: function () {
                _this.changeSlide(false);
              },
              handled: function () {
                // if bullet is focused, make sure focus moves
                if ($(e.target).is(_this.$bullets)) {
                  _this.$bullets.filter('.is-active').focus();
                }
              }
            });
          });
        }
      }
    }

    /**
    * Changes the current slide to a new one.
    * @function
    * @param {Boolean} isLTR - flag if the slide should move left to right.
    * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
    * @param {Number} idx - the index of the new slide in its collection, if one chosen.
    * @fires Orbit#slidechange
    */
    changeSlide(isLTR, chosenSlide, idx) {
      var $curSlide = this.$slides.filter('.is-active').eq(0);

      if (/mui/g.test($curSlide[0].className)) {
        return false;
      } //if the slide is currently animating, kick out of the function

      var $firstSlide = this.$slides.first(),
          $lastSlide = this.$slides.last(),
          dirIn = isLTR ? 'Right' : 'Left',
          dirOut = isLTR ? 'Left' : 'Right',
          _this = this,
          $newSlide;

      if (!chosenSlide) {
        //most of the time, this will be auto played or clicked from the navButtons.
        $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
        this.options.infiniteWrap ? $curSlide.next(`.${ this.options.slideClass }`).length ? $curSlide.next(`.${ this.options.slideClass }`) : $firstSlide : $curSlide.next(`.${ this.options.slideClass }`) : //pick next slide if moving left to right
        this.options.infiniteWrap ? $curSlide.prev(`.${ this.options.slideClass }`).length ? $curSlide.prev(`.${ this.options.slideClass }`) : $lastSlide : $curSlide.prev(`.${ this.options.slideClass }`); //pick prev slide if moving right to left
      } else {
        $newSlide = chosenSlide;
      }

      if ($newSlide.length) {
        /**
        * Triggers before the next slide starts animating in and only if a next slide has been found.
        * @event Orbit#beforeslidechange
        */
        this.$element.trigger('beforeslidechange.zf.orbit', [$curSlide, $newSlide]);

        if (this.options.bullets) {
          idx = idx || this.$slides.index($newSlide); //grab index to update bullets
          this._updateBullets(idx);
        }

        if (this.options.useMUI) {
          Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options[`animInFrom${ dirIn }`], function () {
            $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
          });

          Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options[`animOutTo${ dirOut }`], function () {
            $curSlide.removeAttr('aria-live');
            if (_this.options.autoPlay && !_this.timer.isPaused) {
              _this.timer.restart();
            }
            //do stuff?
          });
        } else {
          $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
          $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
          if (this.options.autoPlay && !this.timer.isPaused) {
            this.timer.restart();
          }
        }
        /**
        * Triggers when the slide has finished animating in.
        * @event Orbit#slidechange
        */
        this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
      }
    }

    /**
    * Updates the active state of the bullets, if displayed.
    * @function
    * @private
    * @param {Number} idx - the index of the current slide.
    */
    _updateBullets(idx) {
      var $oldBullet = this.$element.find(`.${ this.options.boxOfBullets }`).find('.is-active').removeClass('is-active').blur(),
          span = $oldBullet.find('span:last').detach(),
          $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
    }

    /**
    * Destroys the carousel and hides the element.
    * @function
    */
    destroy() {
      this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
      Foundation.unregisterPlugin(this);
    }
  }

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
    * @example true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
    * @example true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
    * @example true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
    * @example 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
    * @example true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
    * @example true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
    * @example true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
    * @example true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
    * @example 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
    * @example 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
    * @example 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
    * @example 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
    * @example 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
    * @example true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.accordionMenu
   * @requires foundation.util.drilldown
   * @requires foundation.util.dropdown-menu
   */

  class ResponsiveMenu {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */
    _init() {
      // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
      if (typeof this.rules === 'string') {
        let rulesTree = {};

        // Parse rules from "classes" pulled from data attribute
        let rules = this.rules.split(' ');

        // Iterate through every rule found
        for (let i = 0; i < rules.length; i++) {
          let rule = rules[i].split('-');
          let ruleSize = rule.length > 1 ? rule[0] : 'small';
          let rulePlugin = rule.length > 1 ? rule[1] : rule[0];

          if (MenuPlugins[rulePlugin] !== null) {
            rulesTree[ruleSize] = MenuPlugins[rulePlugin];
          }
        }

        this.rules = rulesTree;
      }

      if (!$.isEmptyObject(this.rules)) {
        this._checkMediaQueries();
      }
    }

    /**
     * Initializes events for the Menu.
     * @function
     * @private
     */
    _events() {
      var _this = this;

      $(window).on('changed.zf.mediaquery', function () {
        _this._checkMediaQueries();
      });
      // $(window).on('resize.zf.ResponsiveMenu', function() {
      //   _this._checkMediaQueries();
      // });
    }

    /**
     * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
     * @function
     * @private
     */
    _checkMediaQueries() {
      var matchedMq,
          _this = this;
      // Iterate through each rule and find the last matching rule
      $.each(this.rules, function (key) {
        if (Foundation.MediaQuery.atLeast(key)) {
          matchedMq = key;
        }
      });

      // No match? No dice
      if (!matchedMq) return;

      // Plugin already initialized? We good
      if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

      // Remove existing plugin-specific CSS classes
      $.each(MenuPlugins, function (key, value) {
        _this.$element.removeClass(value.cssClass);
      });

      // Add the CSS class for the new plugin
      this.$element.addClass(this.rules[matchedMq].cssClass);

      // Create an instance of the new plugin
      if (this.currentPlugin) this.currentPlugin.destroy();
      this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
    }

    /**
     * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
     * @function
     */
    destroy() {
      this.currentPlugin.destroy();
      $(window).off('.zf.ResponsiveMenu');
      Foundation.unregisterPlugin(this);
    }
  }

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  class ResponsiveToggle {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */
    _init() {
      var targetID = this.$element.data('responsive-toggle');
      if (!targetID) {
        console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
      }

      this.$targetMenu = $(`#${ targetID }`);
      this.$toggler = this.$element.find('[data-toggle]');

      this._update();
    }

    /**
     * Adds necessary event handlers for the tab bar to work.
     * @function
     * @private
     */
    _events() {
      var _this = this;

      this._updateMqHandler = this._update.bind(this);

      $(window).on('changed.zf.mediaquery', this._updateMqHandler);

      this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
    }

    /**
     * Checks the current media query to determine if the tab bar should be visible or hidden.
     * @function
     * @private
     */
    _update() {
      // Mobile
      if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
        this.$element.show();
        this.$targetMenu.hide();
      }

      // Desktop
      else {
          this.$element.hide();
          this.$targetMenu.show();
        }
    }

    /**
     * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
     * @function
     * @fires ResponsiveToggle#toggled
     */
    toggleMenu() {
      if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
        this.$targetMenu.toggle(0);

        /**
         * Fires when the element attached to the tab bar toggles.
         * @event ResponsiveToggle#toggled
         */
        this.$element.trigger('toggled.zf.responsiveToggle');
      }
    }

    destroy() {
      this.$element.off('.zf.responsiveToggle');
      this.$toggler.off('.zf.responsiveToggle');

      $(window).off('changed.zf.mediaquery', this._updateMqHandler);

      Foundation.unregisterPlugin(this);
    }
  }

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @example 'medium'
     */
    hideFor: 'medium'
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  class Reveal {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close',
        'TAB': 'tab_forward',
        'SHIFT_TAB': 'tab_backward'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */
    _init() {
      this.id = this.$element.attr('id');
      this.isActive = false;
      this.cached = { mq: Foundation.MediaQuery.current };
      this.isMobile = mobileSniff();

      this.$anchor = $(`[data-open="${ this.id }"]`).length ? $(`[data-open="${ this.id }"]`) : $(`[data-toggle="${ this.id }"]`);
      this.$anchor.attr({
        'aria-controls': this.id,
        'aria-haspopup': true,
        'tabindex': 0
      });

      if (this.options.fullScreen || this.$element.hasClass('full')) {
        this.options.fullScreen = true;
        this.options.overlay = false;
      }
      if (this.options.overlay && !this.$overlay) {
        this.$overlay = this._makeOverlay(this.id);
      }

      this.$element.attr({
        'role': 'dialog',
        'aria-hidden': true,
        'data-yeti-box': this.id,
        'data-resize': this.id
      });

      if (this.$overlay) {
        this.$element.detach().appendTo(this.$overlay);
      } else {
        this.$element.detach().appendTo($('body'));
        this.$element.addClass('without-overlay');
      }
      this._events();
      if (this.options.deepLink && window.location.hash === `#${ this.id }`) {
        $(window).one('load.zf.reveal', this.open.bind(this));
      }
    }

    /**
     * Creates an overlay div to display behind the modal.
     * @private
     */
    _makeOverlay(id) {
      var $overlay = $('<div></div>').addClass('reveal-overlay').appendTo('body');
      return $overlay;
    }

    /**
     * Updates position of modal
     * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
     * @private
     */
    _updatePosition() {
      var width = this.$element.outerWidth();
      var outerWidth = $(window).width();
      var height = this.$element.outerHeight();
      var outerHeight = $(window).height();
      var left, top;
      if (this.options.hOffset === 'auto') {
        left = parseInt((outerWidth - width) / 2, 10);
      } else {
        left = parseInt(this.options.hOffset, 10);
      }
      if (this.options.vOffset === 'auto') {
        if (height > outerHeight) {
          top = parseInt(Math.min(100, outerHeight / 10), 10);
        } else {
          top = parseInt((outerHeight - height) / 4, 10);
        }
      } else {
        top = parseInt(this.options.vOffset, 10);
      }
      this.$element.css({ top: top + 'px' });
      // only worry about left if we don't have an overlay or we havea  horizontal offset,
      // otherwise we're perfectly in the middle
      if (!this.$overlay || this.options.hOffset !== 'auto') {
        this.$element.css({ left: left + 'px' });
        this.$element.css({ margin: '0px' });
      }
    }

    /**
     * Adds event handlers for the modal.
     * @private
     */
    _events() {
      var _this = this;

      this.$element.on({
        'open.zf.trigger': this.open.bind(this),
        'close.zf.trigger': (event, $element) => {
          if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
            // only close reveal when it's explicitly called
            return this.close.apply(this);
          }
        },
        'toggle.zf.trigger': this.toggle.bind(this),
        'resizeme.zf.trigger': function () {
          _this._updatePosition();
        }
      });

      if (this.$anchor.length) {
        this.$anchor.on('keydown.zf.reveal', function (e) {
          if (e.which === 13 || e.which === 32) {
            e.stopPropagation();
            e.preventDefault();
            _this.open();
          }
        });
      }

      if (this.options.closeOnClick && this.options.overlay) {
        this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
          if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
            return;
          }
          _this.close();
        });
      }
      if (this.options.deepLink) {
        $(window).on(`popstate.zf.reveal:${ this.id }`, this._handleState.bind(this));
      }
    }

    /**
     * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
     * @private
     */
    _handleState(e) {
      if (window.location.hash === '#' + this.id && !this.isActive) {
        this.open();
      } else {
        this.close();
      }
    }

    /**
     * Opens the modal controlled by `this.$anchor`, and closes all others by default.
     * @function
     * @fires Reveal#closeme
     * @fires Reveal#open
     */
    open() {
      if (this.options.deepLink) {
        var hash = `#${ this.id }`;

        if (window.history.pushState) {
          window.history.pushState(null, null, hash);
        } else {
          window.location.hash = hash;
        }
      }

      this.isActive = true;

      // Make elements invisible, but remove display: none so we can get size and positioning
      this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
      if (this.options.overlay) {
        this.$overlay.css({ 'visibility': 'hidden' }).show();
      }

      this._updatePosition();

      this.$element.hide().css({ 'visibility': '' });

      if (this.$overlay) {
        this.$overlay.css({ 'visibility': '' }).hide();
        if (this.$element.hasClass('fast')) {
          this.$overlay.addClass('fast');
        } else if (this.$element.hasClass('slow')) {
          this.$overlay.addClass('slow');
        }
      }

      if (!this.options.multipleOpened) {
        /**
         * Fires immediately before the modal opens.
         * Closes any other modals that are currently open
         * @event Reveal#closeme
         */
        this.$element.trigger('closeme.zf.reveal', this.id);
      }
      // Motion UI method of reveal
      if (this.options.animationIn) {
        var _this = this;
        function afterAnimationFocus() {
          _this.$element.attr({
            'aria-hidden': false,
            'tabindex': -1
          }).focus();
        }
        if (this.options.overlay) {
          Foundation.Motion.animateIn(this.$overlay, 'fade-in');
        }
        Foundation.Motion.animateIn(this.$element, this.options.animationIn, () => {
          this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);
          afterAnimationFocus();
        });
      }
      // jQuery method of reveal
      else {
          if (this.options.overlay) {
            this.$overlay.show(0);
          }
          this.$element.show(this.options.showDelay);
        }

      // handle accessibility
      this.$element.attr({
        'aria-hidden': false,
        'tabindex': -1
      }).focus();

      /**
       * Fires when the modal has successfully opened.
       * @event Reveal#open
       */
      this.$element.trigger('open.zf.reveal');

      if (this.isMobile) {
        this.originalScrollPos = window.pageYOffset;
        $('html, body').addClass('is-reveal-open');
      } else {
        $('body').addClass('is-reveal-open');
      }

      setTimeout(() => {
        this._extraHandlers();
      }, 0);
    }

    /**
     * Adds extra event handlers for the body and window if necessary.
     * @private
     */
    _extraHandlers() {
      var _this = this;
      this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

      if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
        $('body').on('click.zf.reveal', function (e) {
          if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
            return;
          }
          _this.close();
        });
      }

      if (this.options.closeOnEsc) {
        $(window).on('keydown.zf.reveal', function (e) {
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            }
          });
        });
      }

      // lock focus within modal while tabbing
      this.$element.on('keydown.zf.reveal', function (e) {
        var $target = $(this);
        // handle keyboard event with keyboard util
        Foundation.Keyboard.handleKey(e, 'Reveal', {
          tab_forward: function () {
            _this.focusableElements = Foundation.Keyboard.findFocusable(_this.$element);
            if (_this.$element.find(':focus').is(_this.focusableElements.eq(-1))) {
              // left modal downwards, setting focus to first element
              _this.focusableElements.eq(0).focus();
              return true;
            }
            if (_this.focusableElements.length === 0) {
              // no focusable elements inside the modal at all, prevent tabbing in general
              return true;
            }
          },
          tab_backward: function () {
            _this.focusableElements = Foundation.Keyboard.findFocusable(_this.$element);
            if (_this.$element.find(':focus').is(_this.focusableElements.eq(0)) || _this.$element.is(':focus')) {
              // left modal upwards, setting focus to last element
              _this.focusableElements.eq(-1).focus();
              return true;
            }
            if (_this.focusableElements.length === 0) {
              // no focusable elements inside the modal at all, prevent tabbing in general
              return true;
            }
          },
          open: function () {
            if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
              setTimeout(function () {
                // set focus back to anchor if close button has been activated
                _this.$anchor.focus();
              }, 1);
            } else if ($target.is(_this.focusableElements)) {
              // dont't trigger if acual element has focus (i.e. inputs, links, ...)
              _this.open();
            }
          },
          close: function () {
            if (_this.options.closeOnEsc) {
              _this.close();
              _this.$anchor.focus();
            }
          },
          handled: function (preventDefault) {
            if (preventDefault) {
              e.preventDefault();
            }
          }
        });
      });
    }

    /**
     * Closes the modal.
     * @function
     * @fires Reveal#closed
     */
    close() {
      if (!this.isActive || !this.$element.is(':visible')) {
        return false;
      }
      var _this = this;

      // Motion UI method of hiding
      if (this.options.animationOut) {
        if (this.options.overlay) {
          Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
        } else {
          finishUp();
        }

        Foundation.Motion.animateOut(this.$element, this.options.animationOut);
      }
      // jQuery method of hiding
      else {
          if (this.options.overlay) {
            this.$overlay.hide(0, finishUp);
          } else {
            finishUp();
          }

          this.$element.hide(this.options.hideDelay);
        }

      // Conditionals to remove extra event listeners added on open
      if (this.options.closeOnEsc) {
        $(window).off('keydown.zf.reveal');
      }

      if (!this.options.overlay && this.options.closeOnClick) {
        $('body').off('click.zf.reveal');
      }

      this.$element.off('keydown.zf.reveal');

      function finishUp() {
        if (_this.isMobile) {
          $('html, body').removeClass('is-reveal-open');
          if (_this.originalScrollPos) {
            $('body').scrollTop(_this.originalScrollPos);
            _this.originalScrollPos = null;
          }
        } else {
          $('body').removeClass('is-reveal-open');
        }

        _this.$element.attr('aria-hidden', true);

        /**
        * Fires when the modal is done closing.
        * @event Reveal#closed
        */
        _this.$element.trigger('closed.zf.reveal');
      }

      /**
      * Resets the modal content
      * This prevents a running video to keep going in the background
      */
      if (this.options.resetOnClose) {
        this.$element.html(this.$element.html());
      }

      this.isActive = false;
      if (_this.options.deepLink) {
        if (window.history.replaceState) {
          window.history.replaceState("", document.title, window.location.pathname);
        } else {
          window.location.hash = '';
        }
      }
    }

    /**
     * Toggles the open/closed state of a modal.
     * @function
     */
    toggle() {
      if (this.isActive) {
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * Destroys an instance of a modal.
     * @function
     */
    destroy() {
      if (this.options.overlay) {
        this.$element.appendTo($('body')); // move $element outside of $overlay to prevent error unregisterPlugin()
        this.$overlay.hide().off().remove();
      }
      this.$element.hide().off();
      this.$anchor.off('.zf');
      $(window).off(`.zf.reveal:${ this.id }`);

      Foundation.unregisterPlugin(this);
    }
  }

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-in-left'
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-out-right'
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @example true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @example false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @example auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @example auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @example false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @example 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @example true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @example false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @example false
     */
    deepLink: false
  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  class Slider {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */
    _init() {
      this.inputs = this.$element.find('input');
      this.handles = this.$element.find('[data-slider-handle]');

      this.$handle = this.handles.eq(0);
      this.$input = this.inputs.length ? this.inputs.eq(0) : $(`#${ this.$handle.attr('aria-controls') }`);
      this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

      var isDbl = false,
          _this = this;
      if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
        this.options.disabled = true;
        this.$element.addClass(this.options.disabledClass);
      }
      if (!this.inputs.length) {
        this.inputs = $().add(this.$input);
        this.options.binding = true;
      }
      this._setInitAttr(0);
      this._events(this.$handle);

      if (this.handles[1]) {
        this.options.doubleSided = true;
        this.$handle2 = this.handles.eq(1);
        this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $(`#${ this.$handle2.attr('aria-controls') }`);

        if (!this.inputs[1]) {
          this.inputs = this.inputs.add(this.$input2);
        }
        isDbl = true;

        this._setHandlePos(this.$handle, this.options.initialStart, true, function () {

          _this._setHandlePos(_this.$handle2, _this.options.initialEnd, true);
        });
        // this.$handle.triggerHandler('click.zf.slider');
        this._setInitAttr(1);
        this._events(this.$handle2);
      }

      if (!isDbl) {
        this._setHandlePos(this.$handle, this.options.initialStart, true);
      }
    }

    /**
     * Sets the position of the selected handle and fill bar.
     * @function
     * @private
     * @param {jQuery} $hndl - the selected handle to move.
     * @param {Number} location - floating point between the start and end values of the slider bar.
     * @param {Function} cb - callback function to fire on completion.
     * @fires Slider#moved
     * @fires Slider#changed
     */
    _setHandlePos($hndl, location, noInvert, cb) {
      // don't move if the slider has been disabled since its initialization
      if (this.$element.hasClass(this.options.disabledClass)) {
        return;
      }
      //might need to alter that slightly for bars that will have odd number selections.
      location = parseFloat(location); //on input change events, convert string to number...grumble.

      // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
      if (location < this.options.start) {
        location = this.options.start;
      } else if (location > this.options.end) {
        location = this.options.end;
      }

      var isDbl = this.options.doubleSided;

      if (isDbl) {
        //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
        if (this.handles.index($hndl) === 0) {
          var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
          location = location >= h2Val ? h2Val - this.options.step : location;
        } else {
          var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
          location = location <= h1Val ? h1Val + this.options.step : location;
        }
      }

      //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
      //for click and drag events, it's weird due to the scale(-1, 1) css property
      if (this.options.vertical && !noInvert) {
        location = this.options.end - location;
      }

      var _this = this,
          vert = this.options.vertical,
          hOrW = vert ? 'height' : 'width',
          lOrT = vert ? 'top' : 'left',
          handleDim = $hndl[0].getBoundingClientRect()[hOrW],
          elemDim = this.$element[0].getBoundingClientRect()[hOrW],

      //percentage of bar min/max value based on click or drag point
      pctOfBar = percent(location - this.options.start, this.options.end - this.options.start).toFixed(2),

      //number of actual pixels to shift the handle, based on the percentage obtained above
      pxToMove = (elemDim - handleDim) * pctOfBar,

      //percentage of bar to shift the handle
      movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
      //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
      location = parseFloat(location.toFixed(this.options.decimal));
      // declare empty object for css adjustments, only used with 2 handled-sliders
      var css = {};

      this._setValues($hndl, location);

      // TODO update to calculate based on values set to respective inputs??
      if (isDbl) {
        var isLeftHndl = this.handles.index($hndl) === 0,

        //empty variable, will be used for min-height/width for fill bar
        dim,

        //percentage w/h of the handle compared to the slider bar
        handlePct = ~~(percent(handleDim, elemDim) * 100);
        //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
        if (isLeftHndl) {
          //left or top percentage value to apply to the fill bar.
          css[lOrT] = `${ movement }%`;
          //calculate the new min-height/width for the fill bar.
          dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
          //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
          //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
          if (cb && typeof cb === 'function') {
            cb();
          } //this is only needed for the initialization of 2 handled sliders
        } else {
          //just caching the value of the left/bottom handle's left/top property
          var handlePos = parseFloat(this.$handle[0].style[lOrT]);
          //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
          //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
          dim = movement - (isNaN(handlePos) ? this.options.initialStart / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
        }
        // assign the min-height/width to our css object
        css[`min-${ hOrW }`] = `${ dim }%`;
      }

      this.$element.one('finished.zf.animate', function () {
        /**
         * Fires when the handle is done moving.
         * @event Slider#moved
         */
        _this.$element.trigger('moved.zf.slider', [$hndl]);
      });

      //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
      var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

      Foundation.Move(moveTime, $hndl, function () {
        //adjusting the left/top property of the handle, based on the percentage calculated above
        $hndl.css(lOrT, `${ movement }%`);

        if (!_this.options.doubleSided) {
          //if single-handled, a simple method to expand the fill bar
          _this.$fill.css(hOrW, `${ pctOfBar * 100 }%`);
        } else {
          //otherwise, use the css object we created above
          _this.$fill.css(css);
        }
      });

      /**
       * Fires when the value has not been change for a given time.
       * @event Slider#changed
       */
      clearTimeout(_this.timeout);
      _this.timeout = setTimeout(function () {
        _this.$element.trigger('changed.zf.slider', [$hndl]);
      }, _this.options.changedDelay);
    }

    /**
     * Sets the initial attribute for the slider element.
     * @function
     * @private
     * @param {Number} idx - index of the current handle/input to use.
     */
    _setInitAttr(idx) {
      var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
      this.inputs.eq(idx).attr({
        'id': id,
        'max': this.options.end,
        'min': this.options.start,
        'step': this.options.step
      });
      this.handles.eq(idx).attr({
        'role': 'slider',
        'aria-controls': id,
        'aria-valuemax': this.options.end,
        'aria-valuemin': this.options.start,
        'aria-valuenow': idx === 0 ? this.options.initialStart : this.options.initialEnd,
        'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
        'tabindex': 0
      });
    }

    /**
     * Sets the input and `aria-valuenow` values for the slider element.
     * @function
     * @private
     * @param {jQuery} $handle - the currently selected handle.
     * @param {Number} val - floating point of the new value.
     */
    _setValues($handle, val) {
      var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
      this.inputs.eq(idx).val(val);
      $handle.attr('aria-valuenow', val);
    }

    /**
     * Handles events on the slider element.
     * Calculates the new location of the current handle.
     * If there are two handles and the bar was clicked, it determines which handle to move.
     * @function
     * @private
     * @param {Object} e - the `event` object passed from the listener.
     * @param {jQuery} $handle - the current handle to calculate for, if selected.
     * @param {Number} val - floating point number for the new value of the slider.
     * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
     */
    _handleEvent(e, $handle, val) {
      var value, hasVal;
      if (!val) {
        //click or drag events
        e.preventDefault();
        var _this = this,
            vertical = this.options.vertical,
            param = vertical ? 'height' : 'width',
            direction = vertical ? 'top' : 'left',
            eventOffset = vertical ? e.pageY : e.pageX,
            halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
            barDim = this.$element[0].getBoundingClientRect()[param],
            windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

        var elemOffset = this.$element.offset()[direction];

        // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
        // best way to guess this is simulated is if clientY == pageY
        if (e.clientY === e.pageY) {
          eventOffset = eventOffset + windowScroll;
        }
        var eventFromBar = eventOffset - elemOffset;
        var barXY;
        if (eventFromBar < 0) {
          barXY = 0;
        } else if (eventFromBar > barDim) {
          barXY = barDim;
        } else {
          barXY = eventFromBar;
        }
        var offsetPct = percent(barXY, barDim);

        value = (this.options.end - this.options.start) * offsetPct + this.options.start;

        // turn everything around for RTL, yay math!
        if (Foundation.rtl() && !this.options.vertical) {
          value = this.options.end - value;
        }

        value = _this._adjustValue(null, value);
        //boolean flag for the setHandlePos fn, specifically for vertical sliders
        hasVal = false;

        if (!$handle) {
          //figure out which handle it is, pass it to the next function.
          var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
              secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
          $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
        }
      } else {
        //change event on input
        value = this._adjustValue(null, val);
        hasVal = true;
      }

      this._setHandlePos($handle, value, hasVal);
    }

    /**
     * Adjustes value for handle in regard to step value. returns adjusted value
     * @function
     * @private
     * @param {jQuery} $handle - the selected handle.
     * @param {Number} value - value to adjust. used if $handle is falsy
     */
    _adjustValue($handle, value) {
      var val,
          step = this.options.step,
          div = parseFloat(step / 2),
          left,
          prev_val,
          next_val;
      if (!!$handle) {
        val = parseFloat($handle.attr('aria-valuenow'));
      } else {
        val = value;
      }
      left = val % step;
      prev_val = val - left;
      next_val = prev_val + step;
      if (left === 0) {
        return val;
      }
      val = val >= prev_val + div ? next_val : prev_val;
      return val;
    }

    /**
     * Adds event listeners to the slider elements.
     * @function
     * @private
     * @param {jQuery} $handle - the current handle to apply listeners to.
     */
    _events($handle) {
      var _this = this,
          curHandle,
          timer;

      this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
        var idx = _this.inputs.index($(this));
        _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
      });

      if (this.options.clickSelect) {
        this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
          if (_this.$element.data('dragging')) {
            return false;
          }

          if (!$(e.target).is('[data-slider-handle]')) {
            if (_this.options.doubleSided) {
              _this._handleEvent(e);
            } else {
              _this._handleEvent(e, _this.$handle);
            }
          }
        });
      }

      if (this.options.draggable) {
        this.handles.addTouch();

        var $body = $('body');
        $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
          $handle.addClass('is-dragging');
          _this.$fill.addClass('is-dragging'); //
          _this.$element.data('dragging', true);

          curHandle = $(e.currentTarget);

          $body.on('mousemove.zf.slider', function (e) {
            e.preventDefault();
            _this._handleEvent(e, curHandle);
          }).on('mouseup.zf.slider', function (e) {
            _this._handleEvent(e, curHandle);

            $handle.removeClass('is-dragging');
            _this.$fill.removeClass('is-dragging');
            _this.$element.data('dragging', false);

            $body.off('mousemove.zf.slider mouseup.zf.slider');
          });
        })
        // prevent events triggered by touch
        .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
          e.preventDefault();
        });
      }

      $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
        var _$handle = $(this),
            idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
            oldValue = parseFloat(_this.inputs.eq(idx).val()),
            newValue;

        // handle keyboard event with keyboard util
        Foundation.Keyboard.handleKey(e, 'Slider', {
          decrease: function () {
            newValue = oldValue - _this.options.step;
          },
          increase: function () {
            newValue = oldValue + _this.options.step;
          },
          decrease_fast: function () {
            newValue = oldValue - _this.options.step * 10;
          },
          increase_fast: function () {
            newValue = oldValue + _this.options.step * 10;
          },
          handled: function () {
            // only set handle pos when event was handled specially
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue, true);
          }
        });
        /*if (newValue) { // if pressed key has special function, update value
          e.preventDefault();
          _this._setHandlePos(_$handle, newValue);
        }*/
      });
    }

    /**
     * Destroys the slider plugin.
     */
    destroy() {
      this.handles.off('.zf.slider');
      this.inputs.off('.zf.slider');
      this.$element.off('.zf.slider');

      Foundation.unregisterPlugin(this);
    }
  }

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @example 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @example 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @example 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @example 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @example 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @example false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @example true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @example false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @example true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @example false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @example false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @example 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @example 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @example 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @example false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @example 500
     */
    changedDelay: 500
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);

//*********this is in case we go to static, absolute positions instead of dynamic positioning********
// this.setSteps(function() {
//   _this._events();
//   var initStart = _this.options.positions[_this.options.initialStart - 1] || null;
//   var initEnd = _this.options.initialEnd ? _this.options.position[_this.options.initialEnd - 1] : null;
//   if (initStart || initEnd) {
//     _this._handleEvent(initStart, initEnd);
//   }
// });

//***********the other part of absolute positions*************
// Slider.prototype.setSteps = function(cb) {
//   var posChange = this.$element.outerWidth() / this.options.steps;
//   var counter = 0
//   while(counter < this.options.steps) {
//     if (counter) {
//       this.options.positions.push(this.options.positions[counter - 1] + posChange);
//     } else {
//       this.options.positions.push(posChange);
//     }
//     counter++;
//   }
//   cb();
// };
;'use strict';

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  class Sticky {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */
    _init() {
      var $parent = this.$element.parent('[data-sticky-container]'),
          id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
          _this = this;

      if (!$parent.length) {
        this.wasWrapped = true;
      }
      this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
      this.$container.addClass(this.options.containerClass);

      this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id });

      this.scrollCount = this.options.checkEvery;
      this.isStuck = false;
      $(window).one('load.zf.sticky', function () {
        //We calculate the container height to have correct values for anchor points offset calculation.
        _this.containerHeight = _this.$element.css("display") == "none" ? 0 : _this.$element[0].getBoundingClientRect().height;
        _this.$container.css('height', _this.containerHeight);
        _this.elemHeight = _this.containerHeight;
        if (_this.options.anchor !== '') {
          _this.$anchor = $('#' + _this.options.anchor);
        } else {
          _this._parsePoints();
        }

        _this._setSizes(function () {
          _this._calc(false);
        });
        _this._events(id.split('-').reverse().join('-'));
      });
    }

    /**
     * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
     * @function
     * @private
     */
    _parsePoints() {
      var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
          btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
          pts = [top, btm],
          breaks = {};
      for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
        var pt;
        if (typeof pts[i] === 'number') {
          pt = pts[i];
        } else {
          var place = pts[i].split(':'),
              anchor = $(`#${ place[0] }`);

          pt = anchor.offset().top;
          if (place[1] && place[1].toLowerCase() === 'bottom') {
            pt += anchor[0].getBoundingClientRect().height;
          }
        }
        breaks[i] = pt;
      }

      this.points = breaks;
      return;
    }

    /**
     * Adds event handlers for the scrolling element.
     * @private
     * @param {String} id - psuedo-random id for unique scroll event listener.
     */
    _events(id) {
      var _this = this,
          scrollListener = this.scrollListener = `scroll.zf.${ id }`;
      if (this.isOn) {
        return;
      }
      if (this.canStick) {
        this.isOn = true;
        $(window).off(scrollListener).on(scrollListener, function (e) {
          if (_this.scrollCount === 0) {
            _this.scrollCount = _this.options.checkEvery;
            _this._setSizes(function () {
              _this._calc(false, window.pageYOffset);
            });
          } else {
            _this.scrollCount--;
            _this._calc(false, window.pageYOffset);
          }
        });
      }

      this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
        _this._setSizes(function () {
          _this._calc(false);
          if (_this.canStick) {
            if (!_this.isOn) {
              _this._events(id);
            }
          } else if (_this.isOn) {
            _this._pauseListeners(scrollListener);
          }
        });
      });
    }

    /**
     * Removes event handlers for scroll and change events on anchor.
     * @fires Sticky#pause
     * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
     */
    _pauseListeners(scrollListener) {
      this.isOn = false;
      $(window).off(scrollListener);

      /**
       * Fires when the plugin is paused due to resize event shrinking the view.
       * @event Sticky#pause
       * @private
       */
      this.$element.trigger('pause.zf.sticky');
    }

    /**
     * Called on every `scroll` event and on `_init`
     * fires functions based on booleans and cached values
     * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
     * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
     */
    _calc(checkSizes, scroll) {
      if (checkSizes) {
        this._setSizes();
      }

      if (!this.canStick) {
        if (this.isStuck) {
          this._removeSticky(true);
        }
        return false;
      }

      if (!scroll) {
        scroll = window.pageYOffset;
      }

      if (scroll >= this.topPoint) {
        if (scroll <= this.bottomPoint) {
          if (!this.isStuck) {
            this._setSticky();
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(false);
          }
        }
      } else {
        if (this.isStuck) {
          this._removeSticky(true);
        }
      }
    }

    /**
     * Causes the $element to become stuck.
     * Adds `position: fixed;`, and helper classes.
     * @fires Sticky#stuckto
     * @function
     * @private
     */
    _setSticky() {
      var _this = this,
          stickTo = this.options.stickTo,
          mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
          notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
          css = {};

      css[mrgn] = `${ this.options[mrgn] }em`;
      css[stickTo] = 0;
      css[notStuckTo] = 'auto';
      css['left'] = this.$container.offset().left + parseInt(window.getComputedStyle(this.$container[0])["padding-left"], 10);
      this.isStuck = true;
      this.$element.removeClass(`is-anchored is-at-${ notStuckTo }`).addClass(`is-stuck is-at-${ stickTo }`).css(css)
      /**
       * Fires when the $element has become `position: fixed;`
       * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
       * @event Sticky#stuckto
       */
      .trigger(`sticky.zf.stuckto:${ stickTo }`);
      this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
        _this._setSizes();
      });
    }

    /**
     * Causes the $element to become unstuck.
     * Removes `position: fixed;`, and helper classes.
     * Adds other helper classes.
     * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
     * @fires Sticky#unstuckfrom
     * @private
     */
    _removeSticky(isTop) {
      var stickTo = this.options.stickTo,
          stickToTop = stickTo === 'top',
          css = {},
          anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
          mrgn = stickToTop ? 'marginTop' : 'marginBottom',
          notStuckTo = stickToTop ? 'bottom' : 'top',
          topOrBottom = isTop ? 'top' : 'bottom';

      css[mrgn] = 0;

      css['bottom'] = 'auto';
      if (isTop) {
        css['top'] = 0;
      } else {
        css['top'] = anchorPt;
      }

      css['left'] = '';
      this.isStuck = false;
      this.$element.removeClass(`is-stuck is-at-${ stickTo }`).addClass(`is-anchored is-at-${ topOrBottom }`).css(css)
      /**
       * Fires when the $element has become anchored.
       * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
       * @event Sticky#unstuckfrom
       */
      .trigger(`sticky.zf.unstuckfrom:${ topOrBottom }`);
    }

    /**
     * Sets the $element and $container sizes for plugin.
     * Calls `_setBreakPoints`.
     * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
     * @private
     */
    _setSizes(cb) {
      this.canStick = Foundation.MediaQuery.atLeast(this.options.stickyOn);
      if (!this.canStick) {
        if (cb && typeof cb === 'function') {
          cb();
        }
      }
      var _this = this,
          newElemWidth = this.$container[0].getBoundingClientRect().width,
          comp = window.getComputedStyle(this.$container[0]),
          pdng = parseInt(comp['padding-right'], 10);

      if (this.$anchor && this.$anchor.length) {
        this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
      } else {
        this._parsePoints();
      }

      this.$element.css({
        'max-width': `${ newElemWidth - pdng }px`
      });

      var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
      if (this.$element.css("display") == "none") {
        newContainerHeight = 0;
      }
      this.containerHeight = newContainerHeight;
      this.$container.css({
        height: newContainerHeight
      });
      this.elemHeight = newContainerHeight;

      if (this.isStuck) {
        this.$element.css({ "left": this.$container.offset().left + parseInt(comp['padding-left'], 10) });
      } else {
        if (this.$element.hasClass('is-at-bottom')) {
          var anchorPt = (this.points ? this.points[1] - this.$container.offset().top : this.anchorHeight) - this.elemHeight;
          this.$element.css('top', anchorPt);
        }
      }

      this._setBreakPoints(newContainerHeight, function () {
        if (cb && typeof cb === 'function') {
          cb();
        }
      });
    }

    /**
     * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
     * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
     * @param {Function} cb - optional callback function to be called on completion.
     * @private
     */
    _setBreakPoints(elemHeight, cb) {
      if (!this.canStick) {
        if (cb && typeof cb === 'function') {
          cb();
        } else {
          return false;
        }
      }
      var mTop = emCalc(this.options.marginTop),
          mBtm = emCalc(this.options.marginBottom),
          topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
          bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

      // topPoint = this.$anchor.offset().top || this.points[0],
      // bottomPoint = topPoint + this.anchorHeight || this.points[1],
      winHeight = window.innerHeight;

      if (this.options.stickTo === 'top') {
        topPoint -= mTop;
        bottomPoint -= elemHeight + mTop;
      } else if (this.options.stickTo === 'bottom') {
        topPoint -= winHeight - (elemHeight + mBtm);
        bottomPoint -= winHeight - mBtm;
      } else {
        //this would be the stickTo: both option... tricky
      }

      this.topPoint = topPoint;
      this.bottomPoint = bottomPoint;

      if (cb && typeof cb === 'function') {
        cb();
      }
    }

    /**
     * Destroys the current sticky element.
     * Resets the element to the top position first.
     * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
     * @function
     */
    destroy() {
      this._removeSticky(true);

      this.$element.removeClass(`${ this.options.stickyClass } is-anchored is-at-top`).css({
        height: '',
        top: '',
        bottom: '',
        'max-width': ''
      }).off('resizeme.zf.trigger');
      if (this.$anchor && this.$anchor.length) {
        this.$anchor.off('change.zf.sticky');
      }
      $(window).off(this.scrollListener);

      if (this.wasWrapped) {
        this.$element.unwrap();
      } else {
        this.$container.removeClass(this.options.containerClass).css({
          height: ''
        });
      }
      Foundation.unregisterPlugin(this);
    }
  }

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @example '&lt;div data-sticky-container class="small-6 columns"&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to.
     * @option
     * @example 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @example 'exampleId'
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @example 'exampleId:top'
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @example 'exampleId:bottom'
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @example 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @example 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @example 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @example 50
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  class Tabs {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */
    _init() {
      var _this = this;

      this.$tabTitles = this.$element.find(`.${ this.options.linkClass }`);
      this.$tabContent = $(`[data-tabs-content="${ this.$element[0].id }"]`);

      this.$tabTitles.each(function () {
        var $elem = $(this),
            $link = $elem.find('a'),
            isActive = $elem.hasClass('is-active'),
            hash = $link[0].hash.slice(1),
            linkId = $link[0].id ? $link[0].id : `${ hash }-label`,
            $tabContent = $(`#${ hash }`);

        $elem.attr({ 'role': 'presentation' });

        $link.attr({
          'role': 'tab',
          'aria-controls': hash,
          'aria-selected': isActive,
          'id': linkId
        });

        $tabContent.attr({
          'role': 'tabpanel',
          'aria-hidden': !isActive,
          'aria-labelledby': linkId
        });

        if (isActive && _this.options.autoFocus) {
          $link.focus();
        }
      });

      if (this.options.matchHeight) {
        var $images = this.$tabContent.find('img');

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._setHeight.bind(this));
        } else {
          this._setHeight();
        }
      }

      this._events();
    }

    /**
     * Adds event handlers for items within the tabs.
     * @private
     */
    _events() {
      this._addKeyHandler();
      this._addClickHandler();
      this._setHeightMqHandler = null;

      if (this.options.matchHeight) {
        this._setHeightMqHandler = this._setHeight.bind(this);

        $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
      }
    }

    /**
     * Adds click handlers for items within the tabs.
     * @private
     */
    _addClickHandler() {
      var _this = this;

      this.$element.off('click.zf.tabs').on('click.zf.tabs', `.${ this.options.linkClass }`, function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($(this).hasClass('is-active')) {
          return;
        }
        _this._handleTabChange($(this));
      });
    }

    /**
     * Adds keyboard event handlers for items within the tabs.
     * @private
     */
    _addKeyHandler() {
      var _this = this;
      var $firstTab = _this.$element.find('li:first-of-type');
      var $lastTab = _this.$element.find('li:last-of-type');

      this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
        if (e.which === 9) return;

        var $element = $(this),
            $elements = $element.parent('ul').children('li'),
            $prevElement,
            $nextElement;

        $elements.each(function (i) {
          if ($(this).is($element)) {
            if (_this.options.wrapOnKeys) {
              $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
              $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
            } else {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
            }
            return;
          }
        });

        // handle keyboard event with keyboard util
        Foundation.Keyboard.handleKey(e, 'Tabs', {
          open: function () {
            $element.find('[role="tab"]').focus();
            _this._handleTabChange($element);
          },
          previous: function () {
            $prevElement.find('[role="tab"]').focus();
            _this._handleTabChange($prevElement);
          },
          next: function () {
            $nextElement.find('[role="tab"]').focus();
            _this._handleTabChange($nextElement);
          },
          handled: function () {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      });
    }

    /**
     * Opens the tab `$targetContent` defined by `$target`.
     * @param {jQuery} $target - Tab to open.
     * @fires Tabs#change
     * @function
     */
    _handleTabChange($target) {
      var $tabLink = $target.find('[role="tab"]'),
          hash = $tabLink[0].hash,
          $targetContent = this.$tabContent.find(hash),
          $oldTab = this.$element.find(`.${ this.options.linkClass }.is-active`).removeClass('is-active').find('[role="tab"]').attr({ 'aria-selected': 'false' });

      $(`#${ $oldTab.attr('aria-controls') }`).removeClass('is-active').attr({ 'aria-hidden': 'true' });

      $target.addClass('is-active');

      $tabLink.attr({ 'aria-selected': 'true' });

      $targetContent.addClass('is-active').attr({ 'aria-hidden': 'false' });

      /**
       * Fires when the plugin has successfully changed tabs.
       * @event Tabs#change
       */
      this.$element.trigger('change.zf.tabs', [$target]);
    }

    /**
     * Public method for selecting a content pane to display.
     * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
     * @function
     */
    selectTab(elem) {
      var idStr;

      if (typeof elem === 'object') {
        idStr = elem[0].id;
      } else {
        idStr = elem;
      }

      if (idStr.indexOf('#') < 0) {
        idStr = `#${ idStr }`;
      }

      var $target = this.$tabTitles.find(`[href="${ idStr }"]`).parent(`.${ this.options.linkClass }`);

      this._handleTabChange($target);
    }
    /**
     * Sets the height of each panel to the height of the tallest panel.
     * If enabled in options, gets called on media query change.
     * If loading content via external source, can be called directly or with _reflow.
     * @function
     * @private
     */
    _setHeight() {
      var max = 0;
      this.$tabContent.find(`.${ this.options.panelClass }`).css('height', '').each(function () {
        var panel = $(this),
            isActive = panel.hasClass('is-active');

        if (!isActive) {
          panel.css({ 'visibility': 'hidden', 'display': 'block' });
        }

        var temp = this.getBoundingClientRect().height;

        if (!isActive) {
          panel.css({
            'visibility': '',
            'display': ''
          });
        }

        max = temp > max ? temp : max;
      }).css('height', `${ max }px`);
    }

    /**
     * Destroys an instance of an tabs.
     * @fires Tabs#destroyed
     */
    destroy() {
      this.$element.find(`.${ this.options.linkClass }`).off('.zf.tabs').hide().end().find(`.${ this.options.panelClass }`).hide();

      if (this.options.matchHeight) {
        if (this._setHeightMqHandler != null) {
          $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
        }
      }

      Foundation.unregisterPlugin(this);
    }
  }

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * @option
     * @example false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @example true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @example false
     */
    matchHeight: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @example 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the content containers.
     * @option
     * @example 'tabs-panel'
     */
    panelClass: 'tabs-panel'
  };

  function checkClass($elem) {
    return $elem.hasClass('is-active');
  }

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  class Toggler {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */
    _init() {
      var input;
      // Parse animation classes if they were set
      if (this.options.animate) {
        input = this.options.animate.split(' ');

        this.animationIn = input[0];
        this.animationOut = input[1] || null;
      }
      // Otherwise, parse toggle class
      else {
          input = this.$element.data('toggler');
          // Allow for a . at the beginning of the string
          this.className = input[0] === '.' ? input.slice(1) : input;
        }

      // Add ARIA attributes to triggers
      var id = this.$element[0].id;
      $(`[data-open="${ id }"], [data-close="${ id }"], [data-toggle="${ id }"]`).attr('aria-controls', id);
      // If the target is hidden, add aria-hidden
      this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
    }

    /**
     * Initializes events for the toggle trigger.
     * @function
     * @private
     */
    _events() {
      this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
    }

    /**
     * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
     * @function
     * @fires Toggler#on
     * @fires Toggler#off
     */
    toggle() {
      this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
    }

    _toggleClass() {
      this.$element.toggleClass(this.className);

      var isOn = this.$element.hasClass(this.className);
      if (isOn) {
        /**
         * Fires if the target element has the class after a toggle.
         * @event Toggler#on
         */
        this.$element.trigger('on.zf.toggler');
      } else {
        /**
         * Fires if the target element does not have the class after a toggle.
         * @event Toggler#off
         */
        this.$element.trigger('off.zf.toggler');
      }

      this._updateARIA(isOn);
    }

    _toggleAnimate() {
      var _this = this;

      if (this.$element.is(':hidden')) {
        Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
          _this._updateARIA(true);
          this.trigger('on.zf.toggler');
        });
      } else {
        Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
          _this._updateARIA(false);
          this.trigger('off.zf.toggler');
        });
      }
    }

    _updateARIA(isOn) {
      this.$element.attr('aria-expanded', isOn ? true : false);
    }

    /**
     * Destroys the instance of Toggler on the element.
     * @function
     */
    destroy() {
      this.$element.off('.zf.toggler');
      Foundation.unregisterPlugin(this);
    }
  }

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   */

  class Tooltip {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    constructor(element, options) {
      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */
    _init() {
      var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

      this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
      this.options.tipText = this.options.tipText || this.$element.attr('title');
      this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

      this.template.appendTo(document.body).text(this.options.tipText).hide();

      this.$element.attr({
        'title': '',
        'aria-describedby': elemId,
        'data-yeti-box': elemId,
        'data-toggle': elemId,
        'data-resize': elemId
      }).addClass(this.options.triggerClass);

      //helper variables to track movement on collisions
      this.usedPositions = [];
      this.counter = 4;
      this.classChanged = false;

      this._events();
    }

    /**
     * Grabs the current positioning class, if present, and returns the value or an empty string.
     * @private
     */
    _getPositionClass(element) {
      if (!element) {
        return '';
      }
      // var position = element.attr('class').match(/top|left|right/g);
      var position = element[0].className.match(/\b(top|left|right)\b/g);
      position = position ? position[0] : '';
      return position;
    }
    /**
     * builds the tooltip element, adds attributes, and returns the template.
     * @private
     */
    _buildTemplate(id) {
      var templateClasses = `${ this.options.tooltipClass } ${ this.options.positionClass } ${ this.options.templateClasses }`.trim();
      var $template = $('<div></div>').addClass(templateClasses).attr({
        'role': 'tooltip',
        'aria-hidden': true,
        'data-is-active': false,
        'data-is-focus': false,
        'id': id
      });
      return $template;
    }

    /**
     * Function that gets called if a collision event is detected.
     * @param {String} position - positioning class to try
     * @private
     */
    _reposition(position) {
      this.usedPositions.push(position ? position : 'bottom');

      //default, try switching to opposite side
      if (!position && this.usedPositions.indexOf('top') < 0) {
        this.template.addClass('top');
      } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
        this.template.removeClass(position);
      } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
        this.template.removeClass(position).addClass('right');
      } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
        this.template.removeClass(position).addClass('left');
      }

      //if default change didn't work, try bottom or left first
      else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.template.addClass('left');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        }
        //if nothing cleared, set to bottom
        else {
            this.template.removeClass(position);
          }
      this.classChanged = true;
      this.counter--;
    }

    /**
     * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
     * if the tooltip is larger than the screen width, default to full width - any user selected margin
     * @private
     */
    _setPosition() {
      var position = this._getPositionClass(this.template),
          $tipDims = Foundation.Box.GetDimensions(this.template),
          $anchorDims = Foundation.Box.GetDimensions(this.$element),
          direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
          param = direction === 'top' ? 'height' : 'width',
          offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
          _this = this;

      if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
          // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
          'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
          'height': 'auto'
        });
        return false;
      }

      this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

      while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
        this._reposition(position);
        this._setPosition();
      }
    }

    /**
     * reveals the tooltip, and fires an event to close any other open tooltips on the page
     * @fires Tooltip#closeme
     * @fires Tooltip#show
     * @function
     */
    show() {
      if (this.options.showOn !== 'all' && !Foundation.MediaQuery.atLeast(this.options.showOn)) {
        // console.error('The screen is too small to display this tooltip');
        return false;
      }

      var _this = this;
      this.template.css('visibility', 'hidden').show();
      this._setPosition();

      /**
       * Fires to close all other open tooltips on the page
       * @event Closeme#tooltip
       */
      this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

      this.template.attr({
        'data-is-active': true,
        'aria-hidden': false
      });
      _this.isActive = true;
      // console.log(this.template);
      this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
        //maybe do stuff?
      });
      /**
       * Fires when the tooltip is shown
       * @event Tooltip#show
       */
      this.$element.trigger('show.zf.tooltip');
    }

    /**
     * Hides the current tooltip, and resets the positioning class if it was changed due to collision
     * @fires Tooltip#hide
     * @function
     */
    hide() {
      // console.log('hiding', this.$element.data('yeti-box'));
      var _this = this;
      this.template.stop().attr({
        'aria-hidden': true,
        'data-is-active': false
      }).fadeOut(this.options.fadeOutDuration, function () {
        _this.isActive = false;
        _this.isClick = false;
        if (_this.classChanged) {
          _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

          _this.usedPositions = [];
          _this.counter = 4;
          _this.classChanged = false;
        }
      });
      /**
       * fires when the tooltip is hidden
       * @event Tooltip#hide
       */
      this.$element.trigger('hide.zf.tooltip');
    }

    /**
     * adds event listeners for the tooltip and its anchor
     * TODO combine some of the listeners like focus and mouseenter, etc.
     * @private
     */
    _events() {
      var _this = this;
      var $template = this.template;
      var isFocus = false;

      if (!this.options.disableHover) {

        this.$element.on('mouseenter.zf.tooltip', function (e) {
          if (!_this.isActive) {
            _this.timeout = setTimeout(function () {
              _this.show();
            }, _this.options.hoverDelay);
          }
        }).on('mouseleave.zf.tooltip', function (e) {
          clearTimeout(_this.timeout);
          if (!isFocus || _this.isClick && !_this.options.clickOpen) {
            _this.hide();
          }
        });
      }

      if (this.options.clickOpen) {
        this.$element.on('mousedown.zf.tooltip', function (e) {
          e.stopImmediatePropagation();
          if (_this.isClick) {
            //_this.hide();
            // _this.isClick = false;
          } else {
            _this.isClick = true;
            if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
              _this.show();
            }
          }
        });
      } else {
        this.$element.on('mousedown.zf.tooltip', function (e) {
          e.stopImmediatePropagation();
          _this.isClick = true;
        });
      }

      if (!this.options.disableForTouch) {
        this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
          _this.isActive ? _this.hide() : _this.show();
        });
      }

      this.$element.on({
        // 'toggle.zf.trigger': this.toggle.bind(this),
        // 'close.zf.trigger': this.hide.bind(this)
        'close.zf.trigger': this.hide.bind(this)
      });

      this.$element.on('focus.zf.tooltip', function (e) {
        isFocus = true;
        if (_this.isClick) {
          // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
          // a real focus, otherwise on hover and come back we get bad behavior
          if (!_this.options.clickOpen) {
            isFocus = false;
          }
          return false;
        } else {
          _this.show();
        }
      }).on('focusout.zf.tooltip', function (e) {
        isFocus = false;
        _this.isClick = false;
        _this.hide();
      }).on('resizeme.zf.trigger', function () {
        if (_this.isActive) {
          _this._setPosition();
        }
      });
    }

    /**
     * adds a toggle method, in addition to the static show() & hide() functions
     * @function
     */
    toggle() {
      if (this.isActive) {
        this.hide();
      } else {
        this.show();
      }
    }

    /**
     * Destroys an instance of tooltip, removes template element from the view.
     * @function
     */
    destroy() {
      this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tootip')
      //  .removeClass('has-tip')
      .removeAttr('aria-describedby').removeAttr('data-yeti-box').removeAttr('data-toggle').removeAttr('data-resize');

      this.template.remove();

      Foundation.unregisterPlugin(this);
    }
  }

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @example 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @example 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @example 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @example 'my-cool-tip-class'
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @example 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @example 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @example 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @example '&lt;div class="tooltip"&gt;&lt;/div&gt;'
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @example 'Some cool space fact here.'
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @example true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @example 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @example 12
     */
    hOffset: 12
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;jQuery('iframe[src*="youtube.com"]').wrap("<div class='flex-video widescreen'/>");
jQuery('iframe[src*="vimeo.com"]').wrap("<div class='flex-video widescreen vimeo'/>");
;jQuery(document).foundation();
;// Joyride demo
$('#start-jr').on('click', function () {
  $(document).foundation('joyride', 'start');
});
;
;
$(window).bind(' load resize orientationChange ', function () {
  var footer = $("#footer-container");
  var pos = footer.position();
  var height = $(window).height();
  height = height - pos.top;
  height = height - footer.height() - 1;

  function stickyFooter() {
    footer.css({
      'margin-top': height + 'px'
    });
  }

  if (height > 0) {
    stickyFooter();
  }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoYXQtaW5wdXQuanMiLCJmb3VuZGF0aW9uLmNvcmUuanMiLCJmb3VuZGF0aW9uLnV0aWwuYm94LmpzIiwiZm91bmRhdGlvbi51dGlsLmtleWJvYXJkLmpzIiwiZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnkuanMiLCJmb3VuZGF0aW9uLnV0aWwubW90aW9uLmpzIiwiZm91bmRhdGlvbi51dGlsLm5lc3QuanMiLCJmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlci5qcyIsImZvdW5kYXRpb24udXRpbC50b3VjaC5qcyIsImZvdW5kYXRpb24udXRpbC50cmlnZ2Vycy5qcyIsImZvdW5kYXRpb24uYWJpZGUuanMiLCJmb3VuZGF0aW9uLmFjY29yZGlvbi5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uTWVudS5qcyIsImZvdW5kYXRpb24uZHJpbGxkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bi5qcyIsImZvdW5kYXRpb24uZHJvcGRvd25NZW51LmpzIiwiZm91bmRhdGlvbi5lcXVhbGl6ZXIuanMiLCJmb3VuZGF0aW9uLmludGVyY2hhbmdlLmpzIiwiZm91bmRhdGlvbi5tYWdlbGxhbi5qcyIsImZvdW5kYXRpb24ub2ZmY2FudmFzLmpzIiwiZm91bmRhdGlvbi5vcmJpdC5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZU1lbnUuanMiLCJmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGUuanMiLCJmb3VuZGF0aW9uLnJldmVhbC5qcyIsImZvdW5kYXRpb24uc2xpZGVyLmpzIiwiZm91bmRhdGlvbi5zdGlja3kuanMiLCJmb3VuZGF0aW9uLnRhYnMuanMiLCJmb3VuZGF0aW9uLnRvZ2dsZXIuanMiLCJmb3VuZGF0aW9uLnRvb2x0aXAuanMiLCJtb3Rpb24tdWkuanMiLCJmbGV4LXZpZGVvLmpzIiwiaW5pdC1mb3VuZGF0aW9uLmpzIiwiam95cmlkZS1kZW1vLmpzIiwib2ZmQ2FudmFzLmpzIiwic3RpY2t5Zm9vdGVyLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIndoYXRJbnB1dCIsImFjdGl2ZUtleXMiLCJib2R5IiwiYnVmZmVyIiwiY3VycmVudElucHV0Iiwibm9uVHlwaW5nSW5wdXRzIiwibW91c2VXaGVlbCIsImRldGVjdFdoZWVsIiwiaWdub3JlTWFwIiwiaW5wdXRNYXAiLCJpbnB1dFR5cGVzIiwia2V5TWFwIiwicG9pbnRlck1hcCIsInRpbWVyIiwiZXZlbnRCdWZmZXIiLCJjbGVhclRpbWVyIiwic2V0SW5wdXQiLCJldmVudCIsInNldFRpbWVvdXQiLCJidWZmZXJlZEV2ZW50IiwidW5CdWZmZXJlZEV2ZW50IiwiY2xlYXJUaW1lb3V0IiwiZXZlbnRLZXkiLCJrZXkiLCJ2YWx1ZSIsInR5cGUiLCJwb2ludGVyVHlwZSIsImV2ZW50VGFyZ2V0IiwidGFyZ2V0IiwiZXZlbnRUYXJnZXROb2RlIiwibm9kZU5hbWUiLCJ0b0xvd2VyQ2FzZSIsImV2ZW50VGFyZ2V0VHlwZSIsImdldEF0dHJpYnV0ZSIsImhhc0F0dHJpYnV0ZSIsImluZGV4T2YiLCJzd2l0Y2hJbnB1dCIsImxvZ0tleXMiLCJzdHJpbmciLCJzZXRBdHRyaWJ1dGUiLCJwdXNoIiwia2V5Q29kZSIsIndoaWNoIiwic3JjRWxlbWVudCIsInVuTG9nS2V5cyIsImFycmF5UG9zIiwic3BsaWNlIiwiYmluZEV2ZW50cyIsImRvY3VtZW50IiwiUG9pbnRlckV2ZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsIk1TUG9pbnRlckV2ZW50IiwiY3JlYXRlRWxlbWVudCIsIm9ubW91c2V3aGVlbCIsInVuZGVmaW5lZCIsIkFycmF5IiwicHJvdG90eXBlIiwiYXNrIiwia2V5cyIsInR5cGVzIiwic2V0IiwiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ1dWlkIiwiR2V0WW9EaWdpdHMiLCIkZWxlbWVudCIsImRhdGEiLCJ0cmlnZ2VyIiwidW5yZWdpc3RlclBsdWdpbiIsInJlbW92ZUF0dHIiLCJyZW1vdmVEYXRhIiwicHJvcCIsInJlSW5pdCIsInBsdWdpbnMiLCJpc0pRIiwiZWFjaCIsIl9pbml0IiwiX3RoaXMiLCJmbnMiLCJwbGdzIiwiZm9yRWFjaCIsInAiLCJmb3VuZGF0aW9uIiwiT2JqZWN0IiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJlbmQiLCJ0Iiwic3R5bGUiLCJ0cmlnZ2VySGFuZGxlciIsInV0aWwiLCJ0aHJvdHRsZSIsImZ1bmMiLCJkZWxheSIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiY2FsbCIsInBsdWdDbGFzcyIsIlJlZmVyZW5jZUVycm9yIiwiVHlwZUVycm9yIiwiZm4iLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInZlbmRvcnMiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ2cCIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImxhc3RUaW1lIiwiY2FsbGJhY2siLCJuZXh0VGltZSIsIm1heCIsInBlcmZvcm1hbmNlIiwic3RhcnQiLCJGdW5jdGlvbiIsImJpbmQiLCJvVGhpcyIsImFBcmdzIiwiZlRvQmluZCIsImZOT1AiLCJmQm91bmQiLCJjb25jYXQiLCJmdW5jTmFtZVJlZ2V4IiwicmVzdWx0cyIsImV4ZWMiLCJzdHIiLCJpc05hTiIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwialF1ZXJ5IiwiQm94IiwiSW1Ob3RUb3VjaGluZ1lvdSIsIkdldERpbWVuc2lvbnMiLCJHZXRPZmZzZXRzIiwiZWxlbWVudCIsInBhcmVudCIsImxyT25seSIsInRiT25seSIsImVsZURpbXMiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJwYXJEaW1zIiwib2Zmc2V0IiwiaGVpZ2h0Iiwid2lkdGgiLCJ3aW5kb3dEaW1zIiwiYWxsRGlycyIsIkVycm9yIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInBhclJlY3QiLCJwYXJlbnROb2RlIiwid2luUmVjdCIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9VcHBlckNhc2UiLCJzaGlmdEtleSIsImN0cmxLZXkiLCJhbHRLZXkiLCJoYW5kbGVLZXkiLCJjb21wb25lbnQiLCJmdW5jdGlvbnMiLCJjb21tYW5kTGlzdCIsImNtZHMiLCJjb21tYW5kIiwibHRyIiwiZXh0ZW5kIiwicmV0dXJuVmFsdWUiLCJoYW5kbGVkIiwidW5oYW5kbGVkIiwiZmluZEZvY3VzYWJsZSIsImZpbHRlciIsImlzIiwicmVnaXN0ZXIiLCJjb21wb25lbnROYW1lIiwia2NzIiwiayIsImtjIiwiZGVmYXVsdFF1ZXJpZXMiLCJsYW5kc2NhcGUiLCJwb3J0cmFpdCIsInJldGluYSIsInF1ZXJpZXMiLCJjdXJyZW50Iiwic2VsZiIsImV4dHJhY3RlZFN0eWxlcyIsImNzcyIsIm5hbWVkUXVlcmllcyIsInBhcnNlU3R5bGVUb09iamVjdCIsImhhc093blByb3BlcnR5IiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwib24iLCJuZXdTaXplIiwiY3VycmVudFNpemUiLCJzdHlsZU1lZGlhIiwibWVkaWEiLCJzY3JpcHQiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsImluZm8iLCJpZCIsImluc2VydEJlZm9yZSIsImdldENvbXB1dGVkU3R5bGUiLCJjdXJyZW50U3R5bGUiLCJtYXRjaE1lZGl1bSIsInRleHQiLCJzdHlsZVNoZWV0IiwiY3NzVGV4dCIsInRleHRDb250ZW50Iiwic3R5bGVPYmplY3QiLCJyZWR1Y2UiLCJyZXQiLCJwYXJhbSIsInBhcnRzIiwidmFsIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiaXNBcnJheSIsImluaXRDbGFzc2VzIiwiYWN0aXZlQ2xhc3NlcyIsIk1vdGlvbiIsImFuaW1hdGVJbiIsImFuaW1hdGlvbiIsImNiIiwiYW5pbWF0ZSIsImFuaW1hdGVPdXQiLCJNb3ZlIiwiZHVyYXRpb24iLCJhbmltIiwicHJvZyIsIm1vdmUiLCJ0cyIsImlzSW4iLCJlcSIsImluaXRDbGFzcyIsImFjdGl2ZUNsYXNzIiwicmVzZXQiLCJhZGRDbGFzcyIsInNob3ciLCJvZmZzZXRXaWR0aCIsIm9uZSIsImZpbmlzaCIsImhpZGUiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJOZXN0IiwiRmVhdGhlciIsIm1lbnUiLCJpdGVtcyIsInN1Yk1lbnVDbGFzcyIsInN1Ykl0ZW1DbGFzcyIsImhhc1N1YkNsYXNzIiwiJGl0ZW0iLCIkc3ViIiwiY2hpbGRyZW4iLCJCdXJuIiwiVGltZXIiLCJvcHRpb25zIiwibmFtZVNwYWNlIiwicmVtYWluIiwiaXNQYXVzZWQiLCJyZXN0YXJ0IiwiaW5maW5pdGUiLCJwYXVzZSIsIm9uSW1hZ2VzTG9hZGVkIiwiaW1hZ2VzIiwidW5sb2FkZWQiLCJjb21wbGV0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwibmF0dXJhbFdpZHRoIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsInByZXZlbnREZWZhdWx0IiwibW92ZVRocmVzaG9sZCIsInRpbWVUaHJlc2hvbGQiLCJzdGFydFBvc1giLCJzdGFydFBvc1kiLCJzdGFydFRpbWUiLCJlbGFwc2VkVGltZSIsImlzTW92aW5nIiwib25Ub3VjaEVuZCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvblRvdWNoTW92ZSIsIngiLCJ0b3VjaGVzIiwicGFnZVgiLCJ5IiwicGFnZVkiLCJkeCIsImR5IiwiZGlyIiwiYWJzIiwib25Ub3VjaFN0YXJ0IiwiaW5pdCIsInRlYXJkb3duIiwic3BlY2lhbCIsInN3aXBlIiwic2V0dXAiLCJub29wIiwiYWRkVG91Y2giLCJoYW5kbGVUb3VjaCIsImNoYW5nZWRUb3VjaGVzIiwiZmlyc3QiLCJldmVudFR5cGVzIiwidG91Y2hzdGFydCIsInRvdWNobW92ZSIsInRvdWNoZW5kIiwic2ltdWxhdGVkRXZlbnQiLCJNb3VzZUV2ZW50Iiwic2NyZWVuWCIsInNjcmVlblkiLCJjbGllbnRYIiwiY2xpZW50WSIsImNyZWF0ZUV2ZW50IiwiaW5pdE1vdXNlRXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiTXV0YXRpb25PYnNlcnZlciIsInByZWZpeGVzIiwidHJpZ2dlcnMiLCJzdG9wUHJvcGFnYXRpb24iLCJmYWRlT3V0IiwiY2hlY2tMaXN0ZW5lcnMiLCJldmVudHNMaXN0ZW5lciIsInJlc2l6ZUxpc3RlbmVyIiwic2Nyb2xsTGlzdGVuZXIiLCJjbG9zZW1lTGlzdGVuZXIiLCJ5ZXRpQm94ZXMiLCJwbHVnTmFtZXMiLCJsaXN0ZW5lcnMiLCJqb2luIiwib2ZmIiwicGx1Z2luSWQiLCJub3QiLCJkZWJvdW5jZSIsIiRub2RlcyIsIm5vZGVzIiwicXVlcnlTZWxlY3RvckFsbCIsImxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24iLCJtdXRhdGlvblJlY29yZHNMaXN0IiwiJHRhcmdldCIsImVsZW1lbnRPYnNlcnZlciIsIm9ic2VydmUiLCJhdHRyaWJ1dGVzIiwiY2hpbGRMaXN0IiwiY2hhcmFjdGVyRGF0YSIsInN1YnRyZWUiLCJhdHRyaWJ1dGVGaWx0ZXIiLCJJSGVhcllvdSIsIkFiaWRlIiwiZGVmYXVsdHMiLCIkaW5wdXRzIiwiX2V2ZW50cyIsInJlc2V0Rm9ybSIsInZhbGlkYXRlRm9ybSIsInZhbGlkYXRlT24iLCJ2YWxpZGF0ZUlucHV0IiwibGl2ZVZhbGlkYXRlIiwiX3JlZmxvdyIsInJlcXVpcmVkQ2hlY2siLCJpc0dvb2QiLCJjaGVja2VkIiwiZmluZEZvcm1FcnJvciIsIiRlcnJvciIsInNpYmxpbmdzIiwiZm9ybUVycm9yU2VsZWN0b3IiLCJmaW5kTGFiZWwiLCIkbGFiZWwiLCJjbG9zZXN0IiwiZmluZFJhZGlvTGFiZWxzIiwiJGVscyIsImxhYmVscyIsImFkZEVycm9yQ2xhc3NlcyIsIiRmb3JtRXJyb3IiLCJsYWJlbEVycm9yQ2xhc3MiLCJmb3JtRXJyb3JDbGFzcyIsImlucHV0RXJyb3JDbGFzcyIsInJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzIiwiZ3JvdXBOYW1lIiwiJGxhYmVscyIsIiRmb3JtRXJyb3JzIiwicmVtb3ZlRXJyb3JDbGFzc2VzIiwiY2xlYXJSZXF1aXJlIiwidmFsaWRhdGVkIiwiY3VzdG9tVmFsaWRhdG9yIiwidmFsaWRhdG9yIiwiZXF1YWxUbyIsInZhbGlkYXRlUmFkaW8iLCJ2YWxpZGF0ZVRleHQiLCJtYXRjaFZhbGlkYXRpb24iLCJ2YWxpZGF0b3JzIiwiZ29vZFRvR28iLCJtZXNzYWdlIiwiYWNjIiwibm9FcnJvciIsInBhdHRlcm4iLCJpbnB1dFRleHQiLCJ2YWxpZCIsInBhdHRlcm5zIiwiUmVnRXhwIiwiJGdyb3VwIiwicmVxdWlyZWQiLCJjbGVhciIsInYiLCIkZm9ybSIsImRlc3Ryb3kiLCJhbHBoYSIsImFscGhhX251bWVyaWMiLCJpbnRlZ2VyIiwibnVtYmVyIiwiY2FyZCIsImN2diIsImVtYWlsIiwidXJsIiwiZG9tYWluIiwiZGF0ZXRpbWUiLCJkYXRlIiwidGltZSIsImRhdGVJU08iLCJtb250aF9kYXlfeWVhciIsImRheV9tb250aF95ZWFyIiwiY29sb3IiLCJBY2NvcmRpb24iLCIkdGFicyIsImlkeCIsIiRjb250ZW50IiwibGlua0lkIiwiJGluaXRBY3RpdmUiLCJkb3duIiwiJHRhYkNvbnRlbnQiLCJ0b2dnbGUiLCJuZXh0IiwiJGEiLCJmb2N1cyIsIm11bHRpRXhwYW5kIiwicHJldmlvdXMiLCJwcmV2IiwiaGFzQ2xhc3MiLCJ1cCIsImZpcnN0VGltZSIsIiRjdXJyZW50QWN0aXZlIiwic2xpZGVEb3duIiwic2xpZGVTcGVlZCIsIiRhdW50cyIsImFsbG93QWxsQ2xvc2VkIiwic2xpZGVVcCIsInN0b3AiLCJBY2NvcmRpb25NZW51IiwibXVsdGlPcGVuIiwiJG1lbnVMaW5rcyIsInN1YklkIiwiaXNBY3RpdmUiLCJpbml0UGFuZXMiLCIkc3VibWVudSIsIiRlbGVtZW50cyIsIiRwcmV2RWxlbWVudCIsIiRuZXh0RWxlbWVudCIsIm1pbiIsInBhcmVudHMiLCJvcGVuIiwiY2xvc2UiLCJjbG9zZUFsbCIsImhpZGVBbGwiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJwYXJlbnRzVW50aWwiLCJhZGQiLCIkbWVudXMiLCJEcmlsbGRvd24iLCIkc3VibWVudUFuY2hvcnMiLCIkc3VibWVudXMiLCIkbWVudUl0ZW1zIiwiX3ByZXBhcmVNZW51IiwiX2tleWJvYXJkRXZlbnRzIiwiJGxpbmsiLCJwYXJlbnRMaW5rIiwiY2xvbmUiLCJwcmVwZW5kVG8iLCJ3cmFwIiwiJG1lbnUiLCIkYmFjayIsInByZXBlbmQiLCJiYWNrQnV0dG9uIiwiX2JhY2siLCIkd3JhcHBlciIsIndyYXBwZXIiLCJfZ2V0TWF4RGltcyIsIl9zaG93IiwiY2xvc2VPbkNsaWNrIiwiJGJvZHkiLCJjb250YWlucyIsIl9oaWRlQWxsIiwiX2hpZGUiLCJwYXJlbnRTdWJNZW51IiwiX21lbnVMaW5rRXZlbnRzIiwiYmx1ciIsImJpZ2dlc3QiLCJyZXN1bHQiLCJ1bndyYXAiLCJyZW1vdmUiLCJEcm9wZG93biIsIiRpZCIsIiRhbmNob3IiLCJwb3NpdGlvbkNsYXNzIiwiZ2V0UG9zaXRpb25DbGFzcyIsImNvdW50ZXIiLCJ1c2VkUG9zaXRpb25zIiwidmVydGljYWxQb3NpdGlvbiIsIm1hdGNoIiwiaG9yaXpvbnRhbFBvc2l0aW9uIiwiX3JlcG9zaXRpb24iLCJjbGFzc0NoYW5nZWQiLCJfc2V0UG9zaXRpb24iLCJkaXJlY3Rpb24iLCJob3ZlciIsInRpbWVvdXQiLCJob3ZlckRlbGF5IiwiaG92ZXJQYW5lIiwidmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzIiwidGFiX2ZvcndhcmQiLCJ0cmFwRm9jdXMiLCJ0YWJfYmFja3dhcmQiLCJfYWRkQm9keUhhbmRsZXIiLCJhdXRvRm9jdXMiLCIkZm9jdXNhYmxlIiwiY3VyUG9zaXRpb25DbGFzcyIsIkRyb3Bkb3duTWVudSIsInN1YnMiLCJ2ZXJ0aWNhbENsYXNzIiwicmlnaHRDbGFzcyIsImFsaWdubWVudCIsImNoYW5nZWQiLCJfaXNWZXJ0aWNhbCIsImhhc1RvdWNoIiwib250b3VjaHN0YXJ0IiwicGFyQ2xhc3MiLCJoYW5kbGVDbGlja0ZuIiwiaGFzU3ViIiwiaGFzQ2xpY2tlZCIsImNsaWNrT3BlbiIsImZvcmNlRm9sbG93IiwiY2xvc2VPbkNsaWNrSW5zaWRlIiwiZGlzYWJsZUhvdmVyIiwiYXV0b2Nsb3NlIiwiY2xvc2luZ1RpbWUiLCJpc1RhYiIsImluZGV4IiwibmV4dFNpYmxpbmciLCJwcmV2U2libGluZyIsIm9wZW5TdWIiLCJjbG9zZVN1YiIsIiRzaWJzIiwib2xkQ2xhc3MiLCIkcGFyZW50TGkiLCIkdG9DbG9zZSIsInNvbWV0aGluZ1RvQ2xvc2UiLCJFcXVhbGl6ZXIiLCJlcUlkIiwiJHdhdGNoZWQiLCJoYXNOZXN0ZWQiLCJpc05lc3RlZCIsImlzT24iLCJfYmluZEhhbmRsZXIiLCJvblJlc2l6ZU1lQm91bmQiLCJfb25SZXNpemVNZSIsIm9uUG9zdEVxdWFsaXplZEJvdW5kIiwiX29uUG9zdEVxdWFsaXplZCIsImltZ3MiLCJ0b29TbWFsbCIsImVxdWFsaXplT24iLCJfY2hlY2tNUSIsIl9wYXVzZUV2ZW50cyIsIl9raWxsc3dpdGNoIiwiZXF1YWxpemVPblN0YWNrIiwiX2lzU3RhY2tlZCIsImVxdWFsaXplQnlSb3ciLCJnZXRIZWlnaHRzQnlSb3ciLCJhcHBseUhlaWdodEJ5Um93IiwiZ2V0SGVpZ2h0cyIsImFwcGx5SGVpZ2h0IiwiaGVpZ2h0cyIsImxlbiIsIm9mZnNldEhlaWdodCIsImxhc3RFbFRvcE9mZnNldCIsImdyb3VwcyIsImdyb3VwIiwiZWxPZmZzZXRUb3AiLCJqIiwibG4iLCJncm91cHNJTGVuZ3RoIiwibGVuSiIsIkludGVyY2hhbmdlIiwicnVsZXMiLCJjdXJyZW50UGF0aCIsIl9hZGRCcmVha3BvaW50cyIsIl9nZW5lcmF0ZVJ1bGVzIiwicnVsZSIsInBhdGgiLCJTUEVDSUFMX1FVRVJJRVMiLCJydWxlc0xpc3QiLCJyZXNwb25zZSIsImh0bWwiLCJNYWdlbGxhbiIsIiR0YXJnZXRzIiwiJGxpbmtzIiwiJGFjdGl2ZSIsInNjcm9sbFBvcyIsInBhcnNlSW50IiwiY2FsY1BvaW50cyIsInBvaW50cyIsIndpbkhlaWdodCIsImlubmVySGVpZ2h0IiwiY2xpZW50SGVpZ2h0IiwiZG9jSGVpZ2h0Iiwic2Nyb2xsSGVpZ2h0IiwiJHRhciIsInB0IiwidGhyZXNob2xkIiwidGFyZ2V0UG9pbnQiLCJhbmltYXRpb25EdXJhdGlvbiIsImVhc2luZyIsImFuaW1hdGlvbkVhc2luZyIsImRlZXBMaW5raW5nIiwibG9jYXRpb24iLCJoYXNoIiwic2Nyb2xsVG9Mb2MiLCJfdXBkYXRlQWN0aXZlIiwiYXJyaXZhbCIsImxvYyIsImJhck9mZnNldCIsInNjcm9sbFRvcCIsIndpblBvcyIsImN1cklkeCIsImlzRG93biIsImN1clZpc2libGUiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiT2ZmQ2FudmFzIiwiJGxhc3RUcmlnZ2VyIiwiJHRyaWdnZXJzIiwiJGV4aXRlciIsImV4aXRlciIsImFwcGVuZCIsImlzUmV2ZWFsZWQiLCJyZXZlYWxDbGFzcyIsInJldmVhbE9uIiwiX3NldE1RQ2hlY2tlciIsInRyYW5zaXRpb25UaW1lIiwiX2hhbmRsZUtleWJvYXJkIiwicmV2ZWFsIiwiJGNsb3NlciIsImZvcmNlVG9wIiwiX3RyYXBGb2N1cyIsImZvY3VzYWJsZSIsImxhc3QiLCJPcmJpdCIsImNvbnRhaW5lckNsYXNzIiwiJHNsaWRlcyIsInNsaWRlQ2xhc3MiLCIkaW1hZ2VzIiwiaW5pdEFjdGl2ZSIsInVzZU1VSSIsIl9wcmVwYXJlRm9yT3JiaXQiLCJidWxsZXRzIiwiX2xvYWRCdWxsZXRzIiwiYXV0b1BsYXkiLCJnZW9TeW5jIiwiYWNjZXNzaWJsZSIsIiRidWxsZXRzIiwiYm94T2ZCdWxsZXRzIiwidGltZXJEZWxheSIsImNoYW5nZVNsaWRlIiwiX3NldFdyYXBwZXJIZWlnaHQiLCJfc2V0U2xpZGVIZWlnaHQiLCJ0ZW1wIiwicGF1c2VPbkhvdmVyIiwibmF2QnV0dG9ucyIsIiRjb250cm9scyIsIm5leHRDbGFzcyIsInByZXZDbGFzcyIsIiRzbGlkZSIsImlzTFRSIiwiY2hvc2VuU2xpZGUiLCIkY3VyU2xpZGUiLCIkZmlyc3RTbGlkZSIsIiRsYXN0U2xpZGUiLCJkaXJJbiIsImRpck91dCIsIiRuZXdTbGlkZSIsImluZmluaXRlV3JhcCIsIl91cGRhdGVCdWxsZXRzIiwiJG9sZEJ1bGxldCIsInNwYW4iLCJkZXRhY2giLCIkbmV3QnVsbGV0IiwiYW5pbUluRnJvbVJpZ2h0IiwiYW5pbU91dFRvUmlnaHQiLCJhbmltSW5Gcm9tTGVmdCIsImFuaW1PdXRUb0xlZnQiLCJSZXNwb25zaXZlTWVudSIsImN1cnJlbnRNcSIsImN1cnJlbnRQbHVnaW4iLCJydWxlc1RyZWUiLCJydWxlU2l6ZSIsInJ1bGVQbHVnaW4iLCJNZW51UGx1Z2lucyIsImlzRW1wdHlPYmplY3QiLCJfY2hlY2tNZWRpYVF1ZXJpZXMiLCJtYXRjaGVkTXEiLCJjc3NDbGFzcyIsImRyb3Bkb3duIiwiZHJpbGxkb3duIiwiYWNjb3JkaW9uIiwiUmVzcG9uc2l2ZVRvZ2dsZSIsInRhcmdldElEIiwiJHRhcmdldE1lbnUiLCIkdG9nZ2xlciIsIl91cGRhdGUiLCJfdXBkYXRlTXFIYW5kbGVyIiwidG9nZ2xlTWVudSIsImhpZGVGb3IiLCJSZXZlYWwiLCJjYWNoZWQiLCJtcSIsImlzTW9iaWxlIiwibW9iaWxlU25pZmYiLCJmdWxsU2NyZWVuIiwib3ZlcmxheSIsIiRvdmVybGF5IiwiX21ha2VPdmVybGF5IiwiZGVlcExpbmsiLCJfdXBkYXRlUG9zaXRpb24iLCJvdXRlcldpZHRoIiwib3V0ZXJIZWlnaHQiLCJtYXJnaW4iLCJfaGFuZGxlU3RhdGUiLCJtdWx0aXBsZU9wZW5lZCIsImFuaW1hdGlvbkluIiwiYWZ0ZXJBbmltYXRpb25Gb2N1cyIsImZvY3VzYWJsZUVsZW1lbnRzIiwic2hvd0RlbGF5Iiwib3JpZ2luYWxTY3JvbGxQb3MiLCJfZXh0cmFIYW5kbGVycyIsImNsb3NlT25Fc2MiLCJhbmltYXRpb25PdXQiLCJmaW5pc2hVcCIsImhpZGVEZWxheSIsInJlc2V0T25DbG9zZSIsInJlcGxhY2VTdGF0ZSIsInRpdGxlIiwicGF0aG5hbWUiLCJidG1PZmZzZXRQY3QiLCJpUGhvbmVTbmlmZiIsImFuZHJvaWRTbmlmZiIsIlNsaWRlciIsImlucHV0cyIsImhhbmRsZXMiLCIkaGFuZGxlIiwiJGlucHV0IiwiJGZpbGwiLCJ2ZXJ0aWNhbCIsImlzRGJsIiwiZGlzYWJsZWQiLCJkaXNhYmxlZENsYXNzIiwiYmluZGluZyIsIl9zZXRJbml0QXR0ciIsImRvdWJsZVNpZGVkIiwiJGhhbmRsZTIiLCIkaW5wdXQyIiwiX3NldEhhbmRsZVBvcyIsImluaXRpYWxTdGFydCIsImluaXRpYWxFbmQiLCIkaG5kbCIsIm5vSW52ZXJ0IiwiaDJWYWwiLCJzdGVwIiwiaDFWYWwiLCJ2ZXJ0IiwiaE9yVyIsImxPclQiLCJoYW5kbGVEaW0iLCJlbGVtRGltIiwicGN0T2ZCYXIiLCJwZXJjZW50IiwidG9GaXhlZCIsInB4VG9Nb3ZlIiwibW92ZW1lbnQiLCJkZWNpbWFsIiwiX3NldFZhbHVlcyIsImlzTGVmdEhuZGwiLCJkaW0iLCJoYW5kbGVQY3QiLCJoYW5kbGVQb3MiLCJtb3ZlVGltZSIsImNoYW5nZWREZWxheSIsIl9oYW5kbGVFdmVudCIsImhhc1ZhbCIsImV2ZW50T2Zmc2V0IiwiaGFsZk9mSGFuZGxlIiwiYmFyRGltIiwid2luZG93U2Nyb2xsIiwic2Nyb2xsTGVmdCIsImVsZW1PZmZzZXQiLCJldmVudEZyb21CYXIiLCJiYXJYWSIsIm9mZnNldFBjdCIsIl9hZGp1c3RWYWx1ZSIsImZpcnN0SG5kbFBvcyIsImFic1Bvc2l0aW9uIiwic2VjbmRIbmRsUG9zIiwiZGl2IiwicHJldl92YWwiLCJuZXh0X3ZhbCIsImN1ckhhbmRsZSIsImNsaWNrU2VsZWN0IiwiZHJhZ2dhYmxlIiwiY3VycmVudFRhcmdldCIsIl8kaGFuZGxlIiwib2xkVmFsdWUiLCJuZXdWYWx1ZSIsImRlY3JlYXNlIiwiaW5jcmVhc2UiLCJkZWNyZWFzZV9mYXN0IiwiaW5jcmVhc2VfZmFzdCIsImludmVydFZlcnRpY2FsIiwiZnJhYyIsIm51bSIsImNsaWNrUG9zIiwiU3RpY2t5IiwiJHBhcmVudCIsIndhc1dyYXBwZWQiLCIkY29udGFpbmVyIiwiY29udGFpbmVyIiwid3JhcElubmVyIiwic3RpY2t5Q2xhc3MiLCJzY3JvbGxDb3VudCIsImNoZWNrRXZlcnkiLCJpc1N0dWNrIiwiY29udGFpbmVySGVpZ2h0IiwiZWxlbUhlaWdodCIsIl9wYXJzZVBvaW50cyIsIl9zZXRTaXplcyIsIl9jYWxjIiwicmV2ZXJzZSIsInRvcEFuY2hvciIsImJ0bSIsImJ0bUFuY2hvciIsInB0cyIsImJyZWFrcyIsInBsYWNlIiwiY2FuU3RpY2siLCJfcGF1c2VMaXN0ZW5lcnMiLCJjaGVja1NpemVzIiwic2Nyb2xsIiwiX3JlbW92ZVN0aWNreSIsInRvcFBvaW50IiwiYm90dG9tUG9pbnQiLCJfc2V0U3RpY2t5Iiwic3RpY2tUbyIsIm1yZ24iLCJub3RTdHVja1RvIiwiaXNUb3AiLCJzdGlja1RvVG9wIiwiYW5jaG9yUHQiLCJhbmNob3JIZWlnaHQiLCJ0b3BPckJvdHRvbSIsInN0aWNreU9uIiwibmV3RWxlbVdpZHRoIiwiY29tcCIsInBkbmciLCJuZXdDb250YWluZXJIZWlnaHQiLCJfc2V0QnJlYWtQb2ludHMiLCJtVG9wIiwiZW1DYWxjIiwibWFyZ2luVG9wIiwibUJ0bSIsIm1hcmdpbkJvdHRvbSIsImVtIiwiZm9udFNpemUiLCJUYWJzIiwiJHRhYlRpdGxlcyIsImxpbmtDbGFzcyIsIm1hdGNoSGVpZ2h0IiwiX3NldEhlaWdodCIsIl9hZGRLZXlIYW5kbGVyIiwiX2FkZENsaWNrSGFuZGxlciIsIl9zZXRIZWlnaHRNcUhhbmRsZXIiLCJfaGFuZGxlVGFiQ2hhbmdlIiwiJGZpcnN0VGFiIiwiJGxhc3RUYWIiLCJ3cmFwT25LZXlzIiwiJHRhYkxpbmsiLCIkdGFyZ2V0Q29udGVudCIsIiRvbGRUYWIiLCJzZWxlY3RUYWIiLCJpZFN0ciIsInBhbmVsQ2xhc3MiLCJwYW5lbCIsImNoZWNrQ2xhc3MiLCJUb2dnbGVyIiwiaW5wdXQiLCJfdG9nZ2xlQ2xhc3MiLCJ0b2dnbGVDbGFzcyIsIl91cGRhdGVBUklBIiwiX3RvZ2dsZUFuaW1hdGUiLCJUb29sdGlwIiwiaXNDbGljayIsImVsZW1JZCIsIl9nZXRQb3NpdGlvbkNsYXNzIiwidGlwVGV4dCIsInRlbXBsYXRlIiwiX2J1aWxkVGVtcGxhdGUiLCJ0cmlnZ2VyQ2xhc3MiLCJ0ZW1wbGF0ZUNsYXNzZXMiLCJ0b29sdGlwQ2xhc3MiLCIkdGVtcGxhdGUiLCIkdGlwRGltcyIsInNob3dPbiIsImZhZGVJbiIsImZhZGVJbkR1cmF0aW9uIiwiZmFkZU91dER1cmF0aW9uIiwiaXNGb2N1cyIsImRpc2FibGVGb3JUb3VjaCIsInRvdWNoQ2xvc2VUZXh0IiwiZW5kRXZlbnQiLCJNb3Rpb25VSSIsImZvb3RlciIsInBvcyIs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QUFjNUQsU0FBUztBQURoQixLQUFYO0FBR0Q7O0FBRUQsTUFBSUEsU0FBUyxDQUFiLEVBQWdCO0FBQ2RzeUI7QUFDRDtBQUNILENBaEJEIiwiZmlsZSI6ImZvdW5kYXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cud2hhdElucHV0ID0gKGZ1bmN0aW9uKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIHZhcmlhYmxlc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGFycmF5IG9mIGFjdGl2ZWx5IHByZXNzZWQga2V5c1xuICB2YXIgYWN0aXZlS2V5cyA9IFtdO1xuXG4gIC8vIGNhY2hlIGRvY3VtZW50LmJvZHlcbiAgdmFyIGJvZHk7XG5cbiAgLy8gYm9vbGVhbjogdHJ1ZSBpZiB0b3VjaCBidWZmZXIgdGltZXIgaXMgcnVubmluZ1xuICB2YXIgYnVmZmVyID0gZmFsc2U7XG5cbiAgLy8gdGhlIGxhc3QgdXNlZCBpbnB1dCB0eXBlXG4gIHZhciBjdXJyZW50SW5wdXQgPSBudWxsO1xuXG4gIC8vIGBpbnB1dGAgdHlwZXMgdGhhdCBkb24ndCBhY2NlcHQgdGV4dFxuICB2YXIgbm9uVHlwaW5nSW5wdXRzID0gW1xuICAgICdidXR0b24nLFxuICAgICdjaGVja2JveCcsXG4gICAgJ2ZpbGUnLFxuICAgICdpbWFnZScsXG4gICAgJ3JhZGlvJyxcbiAgICAncmVzZXQnLFxuICAgICdzdWJtaXQnXG4gIF07XG5cbiAgLy8gZGV0ZWN0IHZlcnNpb24gb2YgbW91c2Ugd2hlZWwgZXZlbnQgdG8gdXNlXG4gIC8vIHZpYSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWxcbiAgdmFyIG1vdXNlV2hlZWwgPSBkZXRlY3RXaGVlbCgpO1xuXG4gIC8vIGxpc3Qgb2YgbW9kaWZpZXIga2V5cyBjb21tb25seSB1c2VkIHdpdGggdGhlIG1vdXNlIGFuZFxuICAvLyBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgdG8gcHJldmVudCBmYWxzZSBrZXlib2FyZCBkZXRlY3Rpb25cbiAgdmFyIGlnbm9yZU1hcCA9IFtcbiAgICAxNiwgLy8gc2hpZnRcbiAgICAxNywgLy8gY29udHJvbFxuICAgIDE4LCAvLyBhbHRcbiAgICA5MSwgLy8gV2luZG93cyBrZXkgLyBsZWZ0IEFwcGxlIGNtZFxuICAgIDkzICAvLyBXaW5kb3dzIG1lbnUgLyByaWdodCBBcHBsZSBjbWRcbiAgXTtcblxuICAvLyBtYXBwaW5nIG9mIGV2ZW50cyB0byBpbnB1dCB0eXBlc1xuICB2YXIgaW5wdXRNYXAgPSB7XG4gICAgJ2tleWRvd24nOiAna2V5Ym9hcmQnLFxuICAgICdrZXl1cCc6ICdrZXlib2FyZCcsXG4gICAgJ21vdXNlZG93bic6ICdtb3VzZScsXG4gICAgJ21vdXNlbW92ZSc6ICdtb3VzZScsXG4gICAgJ01TUG9pbnRlckRvd24nOiAncG9pbnRlcicsXG4gICAgJ01TUG9pbnRlck1vdmUnOiAncG9pbnRlcicsXG4gICAgJ3BvaW50ZXJkb3duJzogJ3BvaW50ZXInLFxuICAgICdwb2ludGVybW92ZSc6ICdwb2ludGVyJyxcbiAgICAndG91Y2hzdGFydCc6ICd0b3VjaCdcbiAgfTtcblxuICAvLyBhZGQgY29ycmVjdCBtb3VzZSB3aGVlbCBldmVudCBtYXBwaW5nIHRvIGBpbnB1dE1hcGBcbiAgaW5wdXRNYXBbZGV0ZWN0V2hlZWwoKV0gPSAnbW91c2UnO1xuXG4gIC8vIGFycmF5IG9mIGFsbCB1c2VkIGlucHV0IHR5cGVzXG4gIHZhciBpbnB1dFR5cGVzID0gW107XG5cbiAgLy8gbWFwcGluZyBvZiBrZXkgY29kZXMgdG8gYSBjb21tb24gbmFtZVxuICB2YXIga2V5TWFwID0ge1xuICAgIDk6ICd0YWInLFxuICAgIDEzOiAnZW50ZXInLFxuICAgIDE2OiAnc2hpZnQnLFxuICAgIDI3OiAnZXNjJyxcbiAgICAzMjogJ3NwYWNlJyxcbiAgICAzNzogJ2xlZnQnLFxuICAgIDM4OiAndXAnLFxuICAgIDM5OiAncmlnaHQnLFxuICAgIDQwOiAnZG93bidcbiAgfTtcblxuICAvLyBtYXAgb2YgSUUgMTAgcG9pbnRlciBldmVudHNcbiAgdmFyIHBvaW50ZXJNYXAgPSB7XG4gICAgMjogJ3RvdWNoJyxcbiAgICAzOiAndG91Y2gnLCAvLyB0cmVhdCBwZW4gbGlrZSB0b3VjaFxuICAgIDQ6ICdtb3VzZSdcbiAgfTtcblxuICAvLyB0b3VjaCBidWZmZXIgdGltZXJcbiAgdmFyIHRpbWVyO1xuXG5cbiAgLypcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgICBmdW5jdGlvbnNcbiAgICAtLS0tLS0tLS0tLS0tLS1cbiAgKi9cblxuICAvLyBhbGxvd3MgZXZlbnRzIHRoYXQgYXJlIGFsc28gdHJpZ2dlcmVkIHRvIGJlIGZpbHRlcmVkIG91dCBmb3IgYHRvdWNoc3RhcnRgXG4gIGZ1bmN0aW9uIGV2ZW50QnVmZmVyKCkge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBzZXRJbnB1dChldmVudCk7XG5cbiAgICBidWZmZXIgPSB0cnVlO1xuICAgIHRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBidWZmZXIgPSBmYWxzZTtcbiAgICB9LCA2NTApO1xuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyZWRFdmVudChldmVudCkge1xuICAgIGlmICghYnVmZmVyKSBzZXRJbnB1dChldmVudCk7XG4gIH1cblxuICBmdW5jdGlvbiB1bkJ1ZmZlcmVkRXZlbnQoZXZlbnQpIHtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgc2V0SW5wdXQoZXZlbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYXJUaW1lcigpIHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldElucHV0KGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50S2V5ID0ga2V5KGV2ZW50KTtcbiAgICB2YXIgdmFsdWUgPSBpbnB1dE1hcFtldmVudC50eXBlXTtcbiAgICBpZiAodmFsdWUgPT09ICdwb2ludGVyJykgdmFsdWUgPSBwb2ludGVyVHlwZShldmVudCk7XG5cbiAgICAvLyBkb24ndCBkbyBhbnl0aGluZyBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgaW5wdXQgdHlwZSBhbHJlYWR5IHNldFxuICAgIGlmIChjdXJyZW50SW5wdXQgIT09IHZhbHVlKSB7XG4gICAgICB2YXIgZXZlbnRUYXJnZXQgPSB0YXJnZXQoZXZlbnQpO1xuICAgICAgdmFyIGV2ZW50VGFyZ2V0Tm9kZSA9IGV2ZW50VGFyZ2V0Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgZXZlbnRUYXJnZXRUeXBlID0gKGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ2lucHV0JykgPyBldmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA6IG51bGw7XG5cbiAgICAgIGlmIChcbiAgICAgICAgKC8vIG9ubHkgaWYgdGhlIHVzZXIgZmxhZyB0byBhbGxvdyB0eXBpbmcgaW4gZm9ybSBmaWVsZHMgaXNuJ3Qgc2V0XG4gICAgICAgICFib2R5Lmhhc0F0dHJpYnV0ZSgnZGF0YS13aGF0aW5wdXQtZm9ybXR5cGluZycpICYmXG5cbiAgICAgICAgLy8gb25seSBpZiBjdXJyZW50SW5wdXQgaGFzIGEgdmFsdWVcbiAgICAgICAgY3VycmVudElucHV0ICYmXG5cbiAgICAgICAgLy8gb25seSBpZiB0aGUgaW5wdXQgaXMgYGtleWJvYXJkYFxuICAgICAgICB2YWx1ZSA9PT0gJ2tleWJvYXJkJyAmJlxuXG4gICAgICAgIC8vIG5vdCBpZiB0aGUga2V5IGlzIGBUQUJgXG4gICAgICAgIGtleU1hcFtldmVudEtleV0gIT09ICd0YWInICYmXG5cbiAgICAgICAgLy8gb25seSBpZiB0aGUgdGFyZ2V0IGlzIGEgZm9ybSBpbnB1dCB0aGF0IGFjY2VwdHMgdGV4dFxuICAgICAgICAoXG4gICAgICAgICAgIGV2ZW50VGFyZ2V0Tm9kZSA9PT0gJ3RleHRhcmVhJyB8fFxuICAgICAgICAgICBldmVudFRhcmdldE5vZGUgPT09ICdzZWxlY3QnIHx8XG4gICAgICAgICAgIChldmVudFRhcmdldE5vZGUgPT09ICdpbnB1dCcgJiYgbm9uVHlwaW5nSW5wdXRzLmluZGV4T2YoZXZlbnRUYXJnZXRUeXBlKSA8IDApXG4gICAgICAgICkpIHx8IChcbiAgICAgICAgICAvLyBpZ25vcmUgbW9kaWZpZXIga2V5c1xuICAgICAgICAgIGlnbm9yZU1hcC5pbmRleE9mKGV2ZW50S2V5KSA+IC0xXG4gICAgICAgIClcbiAgICAgICkge1xuICAgICAgICAvLyBpZ25vcmUga2V5Ym9hcmQgdHlwaW5nXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzd2l0Y2hJbnB1dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlID09PSAna2V5Ym9hcmQnKSBsb2dLZXlzKGV2ZW50S2V5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN3aXRjaElucHV0KHN0cmluZykge1xuICAgIGN1cnJlbnRJbnB1dCA9IHN0cmluZztcbiAgICBib2R5LnNldEF0dHJpYnV0ZSgnZGF0YS13aGF0aW5wdXQnLCBjdXJyZW50SW5wdXQpO1xuXG4gICAgaWYgKGlucHV0VHlwZXMuaW5kZXhPZihjdXJyZW50SW5wdXQpID09PSAtMSkgaW5wdXRUeXBlcy5wdXNoKGN1cnJlbnRJbnB1dCk7XG4gIH1cblxuICBmdW5jdGlvbiBrZXkoZXZlbnQpIHtcbiAgICByZXR1cm4gKGV2ZW50LmtleUNvZGUpID8gZXZlbnQua2V5Q29kZSA6IGV2ZW50LndoaWNoO1xuICB9XG5cbiAgZnVuY3Rpb24gdGFyZ2V0KGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuICB9XG5cbiAgZnVuY3Rpb24gcG9pbnRlclR5cGUoZXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIGV2ZW50LnBvaW50ZXJUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHBvaW50ZXJNYXBbZXZlbnQucG9pbnRlclR5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKGV2ZW50LnBvaW50ZXJUeXBlID09PSAncGVuJykgPyAndG91Y2gnIDogZXZlbnQucG9pbnRlclR5cGU7IC8vIHRyZWF0IHBlbiBsaWtlIHRvdWNoXG4gICAgfVxuICB9XG5cbiAgLy8ga2V5Ym9hcmQgbG9nZ2luZ1xuICBmdW5jdGlvbiBsb2dLZXlzKGV2ZW50S2V5KSB7XG4gICAgaWYgKGFjdGl2ZUtleXMuaW5kZXhPZihrZXlNYXBbZXZlbnRLZXldKSA9PT0gLTEgJiYga2V5TWFwW2V2ZW50S2V5XSkgYWN0aXZlS2V5cy5wdXNoKGtleU1hcFtldmVudEtleV0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5Mb2dLZXlzKGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50S2V5ID0ga2V5KGV2ZW50KTtcbiAgICB2YXIgYXJyYXlQb3MgPSBhY3RpdmVLZXlzLmluZGV4T2Yoa2V5TWFwW2V2ZW50S2V5XSk7XG5cbiAgICBpZiAoYXJyYXlQb3MgIT09IC0xKSBhY3RpdmVLZXlzLnNwbGljZShhcnJheVBvcywgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kRXZlbnRzKCkge1xuICAgIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgLy8gcG9pbnRlciBldmVudHMgKG1vdXNlLCBwZW4sIHRvdWNoKVxuICAgIGlmICh3aW5kb3cuUG9pbnRlckV2ZW50KSB7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJkb3duJywgYnVmZmVyZWRFdmVudCk7XG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgYnVmZmVyZWRFdmVudCk7XG4gICAgfSBlbHNlIGlmICh3aW5kb3cuTVNQb2ludGVyRXZlbnQpIHtcbiAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcignTVNQb2ludGVyRG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdNU1BvaW50ZXJNb3ZlJywgYnVmZmVyZWRFdmVudCk7XG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gbW91c2UgZXZlbnRzXG4gICAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJ1ZmZlcmVkRXZlbnQpO1xuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBidWZmZXJlZEV2ZW50KTtcblxuICAgICAgLy8gdG91Y2ggZXZlbnRzXG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KSB7XG4gICAgICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGV2ZW50QnVmZmVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBtb3VzZSB3aGVlbFxuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcihtb3VzZVdoZWVsLCBidWZmZXJlZEV2ZW50KTtcblxuICAgIC8vIGtleWJvYXJkIGV2ZW50c1xuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHVuQnVmZmVyZWRFdmVudCk7XG4gICAgYm9keS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIHVuQnVmZmVyZWRFdmVudCk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCB1bkxvZ0tleXMpO1xuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIHV0aWxpdGllc1xuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIC8vIGRldGVjdCB2ZXJzaW9uIG9mIG1vdXNlIHdoZWVsIGV2ZW50IHRvIHVzZVxuICAvLyB2aWEgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzL3doZWVsXG4gIGZ1bmN0aW9uIGRldGVjdFdoZWVsKCkge1xuICAgIHJldHVybiBtb3VzZVdoZWVsID0gJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpID9cbiAgICAgICd3aGVlbCcgOiAvLyBNb2Rlcm4gYnJvd3NlcnMgc3VwcG9ydCBcIndoZWVsXCJcblxuICAgICAgZG9jdW1lbnQub25tb3VzZXdoZWVsICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAnbW91c2V3aGVlbCcgOiAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcbiAgICAgICAgJ0RPTU1vdXNlU2Nyb2xsJzsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XG4gIH1cblxuXG4gIC8qXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICAgaW5pdFxuXG4gICAgZG9uJ3Qgc3RhcnQgc2NyaXB0IHVubGVzcyBicm93c2VyIGN1dHMgdGhlIG11c3RhcmQsXG4gICAgYWxzbyBwYXNzZXMgaWYgcG9seWZpbGxzIGFyZSB1c2VkXG4gICAgLS0tLS0tLS0tLS0tLS0tXG4gICovXG5cbiAgaWYgKFxuICAgICdhZGRFdmVudExpc3RlbmVyJyBpbiB3aW5kb3cgJiZcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZlxuICApIHtcblxuICAgIC8vIGlmIHRoZSBkb20gaXMgYWxyZWFkeSByZWFkeSBhbHJlYWR5IChzY3JpcHQgd2FzIHBsYWNlZCBhdCBib3R0b20gb2YgPGJvZHk+KVxuICAgIGlmIChkb2N1bWVudC5ib2R5KSB7XG4gICAgICBiaW5kRXZlbnRzKCk7XG5cbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIGRvbSB0byBsb2FkIChzY3JpcHQgd2FzIHBsYWNlZCBpbiB0aGUgPGhlYWQ+KVxuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgYmluZEV2ZW50cyk7XG4gICAgfVxuICB9XG5cblxuICAvKlxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAgIGFwaVxuICAgIC0tLS0tLS0tLS0tLS0tLVxuICAqL1xuXG4gIHJldHVybiB7XG5cbiAgICAvLyByZXR1cm5zIHN0cmluZzogdGhlIGN1cnJlbnQgaW5wdXQgdHlwZVxuICAgIGFzazogZnVuY3Rpb24oKSB7IHJldHVybiBjdXJyZW50SW5wdXQ7IH0sXG5cbiAgICAvLyByZXR1cm5zIGFycmF5OiBjdXJyZW50bHkgcHJlc3NlZCBrZXlzXG4gICAga2V5czogZnVuY3Rpb24oKSB7IHJldHVybiBhY3RpdmVLZXlzOyB9LFxuXG4gICAgLy8gcmV0dXJucyBhcnJheTogYWxsIHRoZSBkZXRlY3RlZCBpbnB1dCB0eXBlc1xuICAgIHR5cGVzOiBmdW5jdGlvbigpIHsgcmV0dXJuIGlucHV0VHlwZXM7IH0sXG5cbiAgICAvLyBhY2NlcHRzIHN0cmluZzogbWFudWFsbHkgc2V0IHRoZSBpbnB1dCB0eXBlXG4gICAgc2V0OiBzd2l0Y2hJbnB1dFxuICB9O1xuXG59KCkpO1xuIiwiIWZ1bmN0aW9uKCQpIHtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBGT1VOREFUSU9OX1ZFUlNJT04gPSAnNi4yLjQnO1xuXG4vLyBHbG9iYWwgRm91bmRhdGlvbiBvYmplY3Rcbi8vIFRoaXMgaXMgYXR0YWNoZWQgdG8gdGhlIHdpbmRvdywgb3IgdXNlZCBhcyBhIG1vZHVsZSBmb3IgQU1EL0Jyb3dzZXJpZnlcbnZhciBGb3VuZGF0aW9uID0ge1xuICB2ZXJzaW9uOiBGT1VOREFUSU9OX1ZFUlNJT04sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBpbml0aWFsaXplZCBwbHVnaW5zLlxuICAgKi9cbiAgX3BsdWdpbnM6IHt9LFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgZ2VuZXJhdGVkIHVuaXF1ZSBpZHMgZm9yIHBsdWdpbiBpbnN0YW5jZXNcbiAgICovXG4gIF91dWlkczogW10sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBib29sZWFuIGZvciBSVEwgc3VwcG9ydFxuICAgKi9cbiAgcnRsOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiAkKCdodG1sJykuYXR0cignZGlyJykgPT09ICdydGwnO1xuICB9LFxuICAvKipcbiAgICogRGVmaW5lcyBhIEZvdW5kYXRpb24gcGx1Z2luLCBhZGRpbmcgaXQgdG8gdGhlIGBGb3VuZGF0aW9uYCBuYW1lc3BhY2UgYW5kIHRoZSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZSB3aGVuIHJlZmxvd2luZy5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcGx1Z2luLlxuICAgKi9cbiAgcGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIGFkZGluZyB0byBnbG9iYWwgRm91bmRhdGlvbiBvYmplY3RcbiAgICAvLyBFeGFtcGxlczogRm91bmRhdGlvbi5SZXZlYWwsIEZvdW5kYXRpb24uT2ZmQ2FudmFzXG4gICAgdmFyIGNsYXNzTmFtZSA9IChuYW1lIHx8IGZ1bmN0aW9uTmFtZShwbHVnaW4pKTtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIHN0b3JpbmcgdGhlIHBsdWdpbiwgYWxzbyB1c2VkIHRvIGNyZWF0ZSB0aGUgaWRlbnRpZnlpbmcgZGF0YSBhdHRyaWJ1dGUgZm9yIHRoZSBwbHVnaW5cbiAgICAvLyBFeGFtcGxlczogZGF0YS1yZXZlYWwsIGRhdGEtb2ZmLWNhbnZhc1xuICAgIHZhciBhdHRyTmFtZSAgPSBoeXBoZW5hdGUoY2xhc3NOYW1lKTtcblxuICAgIC8vIEFkZCB0byB0aGUgRm91bmRhdGlvbiBvYmplY3QgYW5kIHRoZSBwbHVnaW5zIGxpc3QgKGZvciByZWZsb3dpbmcpXG4gICAgdGhpcy5fcGx1Z2luc1thdHRyTmFtZV0gPSB0aGlzW2NsYXNzTmFtZV0gPSBwbHVnaW47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUG9wdWxhdGVzIHRoZSBfdXVpZHMgYXJyYXkgd2l0aCBwb2ludGVycyB0byBlYWNoIGluZGl2aWR1YWwgcGx1Z2luIGluc3RhbmNlLlxuICAgKiBBZGRzIHRoZSBgemZQbHVnaW5gIGRhdGEtYXR0cmlidXRlIHRvIHByb2dyYW1tYXRpY2FsbHkgY3JlYXRlZCBwbHVnaW5zIHRvIGFsbG93IHVzZSBvZiAkKHNlbGVjdG9yKS5mb3VuZGF0aW9uKG1ldGhvZCkgY2FsbHMuXG4gICAqIEFsc28gZmlyZXMgdGhlIGluaXRpYWxpemF0aW9uIGV2ZW50IGZvciBlYWNoIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgcGx1Z2luLCBwYXNzZWQgYXMgYSBjYW1lbENhc2VkIHN0cmluZy5cbiAgICogQGZpcmVzIFBsdWdpbiNpbml0XG4gICAqL1xuICByZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IG5hbWUgPyBoeXBoZW5hdGUobmFtZSkgOiBmdW5jdGlvbk5hbWUocGx1Z2luLmNvbnN0cnVjdG9yKS50b0xvd2VyQ2FzZSgpO1xuICAgIHBsdWdpbi51dWlkID0gdGhpcy5HZXRZb0RpZ2l0cyg2LCBwbHVnaW5OYW1lKTtcblxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkpeyBwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCwgcGx1Z2luLnV1aWQpOyB9XG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpKXsgcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJywgcGx1Z2luKTsgfVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgaW5pdGlhbGl6ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNpbml0XG4gICAgICAgICAgICovXG4gICAgcGx1Z2luLiRlbGVtZW50LnRyaWdnZXIoYGluaXQuemYuJHtwbHVnaW5OYW1lfWApO1xuXG4gICAgdGhpcy5fdXVpZHMucHVzaChwbHVnaW4udXVpZCk7XG5cbiAgICByZXR1cm47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUmVtb3ZlcyB0aGUgcGx1Z2lucyB1dWlkIGZyb20gdGhlIF91dWlkcyBhcnJheS5cbiAgICogUmVtb3ZlcyB0aGUgemZQbHVnaW4gZGF0YSBhdHRyaWJ1dGUsIGFzIHdlbGwgYXMgdGhlIGRhdGEtcGx1Z2luLW5hbWUgYXR0cmlidXRlLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBkZXN0cm95ZWQgZXZlbnQgZm9yIHRoZSBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBmaXJlcyBQbHVnaW4jZGVzdHJveWVkXG4gICAqL1xuICB1bnJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHZhciBwbHVnaW5OYW1lID0gaHlwaGVuYXRlKGZ1bmN0aW9uTmFtZShwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKS5jb25zdHJ1Y3RvcikpO1xuXG4gICAgdGhpcy5fdXVpZHMuc3BsaWNlKHRoaXMuX3V1aWRzLmluZGV4T2YocGx1Z2luLnV1aWQpLCAxKTtcbiAgICBwbHVnaW4uJGVsZW1lbnQucmVtb3ZlQXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkucmVtb3ZlRGF0YSgnemZQbHVnaW4nKVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgYmVlbiBkZXN0cm95ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNkZXN0cm95ZWRcbiAgICAgICAgICAgKi9cbiAgICAgICAgICAudHJpZ2dlcihgZGVzdHJveWVkLnpmLiR7cGx1Z2luTmFtZX1gKTtcbiAgICBmb3IodmFyIHByb3AgaW4gcGx1Z2luKXtcbiAgICAgIHBsdWdpbltwcm9wXSA9IG51bGw7Ly9jbGVhbiB1cCBzY3JpcHQgdG8gcHJlcCBmb3IgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICAgIH1cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBDYXVzZXMgb25lIG9yIG1vcmUgYWN0aXZlIHBsdWdpbnMgdG8gcmUtaW5pdGlhbGl6ZSwgcmVzZXR0aW5nIGV2ZW50IGxpc3RlbmVycywgcmVjYWxjdWxhdGluZyBwb3NpdGlvbnMsIGV0Yy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBsdWdpbnMgLSBvcHRpb25hbCBzdHJpbmcgb2YgYW4gaW5kaXZpZHVhbCBwbHVnaW4ga2V5LCBhdHRhaW5lZCBieSBjYWxsaW5nIGAkKGVsZW1lbnQpLmRhdGEoJ3BsdWdpbk5hbWUnKWAsIG9yIHN0cmluZyBvZiBhIHBsdWdpbiBjbGFzcyBpLmUuIGAnZHJvcGRvd24nYFxuICAgKiBAZGVmYXVsdCBJZiBubyBhcmd1bWVudCBpcyBwYXNzZWQsIHJlZmxvdyBhbGwgY3VycmVudGx5IGFjdGl2ZSBwbHVnaW5zLlxuICAgKi9cbiAgIHJlSW5pdDogZnVuY3Rpb24ocGx1Z2lucyl7XG4gICAgIHZhciBpc0pRID0gcGx1Z2lucyBpbnN0YW5jZW9mICQ7XG4gICAgIHRyeXtcbiAgICAgICBpZihpc0pRKXtcbiAgICAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAkKHRoaXMpLmRhdGEoJ3pmUGx1Z2luJykuX2luaXQoKTtcbiAgICAgICAgIH0pO1xuICAgICAgIH1lbHNle1xuICAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgcGx1Z2lucyxcbiAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgIGZucyA9IHtcbiAgICAgICAgICAgJ29iamVjdCc6IGZ1bmN0aW9uKHBsZ3Mpe1xuICAgICAgICAgICAgIHBsZ3MuZm9yRWFjaChmdW5jdGlvbihwKXtcbiAgICAgICAgICAgICAgIHAgPSBoeXBoZW5hdGUocCk7XG4gICAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICdzdHJpbmcnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHBsdWdpbnMgPSBoeXBoZW5hdGUocGx1Z2lucyk7XG4gICAgICAgICAgICAgJCgnW2RhdGEtJysgcGx1Z2lucyArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAndW5kZWZpbmVkJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICB0aGlzWydvYmplY3QnXShPYmplY3Qua2V5cyhfdGhpcy5fcGx1Z2lucykpO1xuICAgICAgICAgICB9XG4gICAgICAgICB9O1xuICAgICAgICAgZm5zW3R5cGVdKHBsdWdpbnMpO1xuICAgICAgIH1cbiAgICAgfWNhdGNoKGVycil7XG4gICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICB9ZmluYWxseXtcbiAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICAgfVxuICAgfSxcblxuICAvKipcbiAgICogcmV0dXJucyBhIHJhbmRvbSBiYXNlLTM2IHVpZCB3aXRoIG5hbWVzcGFjaW5nXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIC0gbnVtYmVyIG9mIHJhbmRvbSBiYXNlLTM2IGRpZ2l0cyBkZXNpcmVkLiBJbmNyZWFzZSBmb3IgbW9yZSByYW5kb20gc3RyaW5ncy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZSAtIG5hbWUgb2YgcGx1Z2luIHRvIGJlIGluY29ycG9yYXRlZCBpbiB1aWQsIG9wdGlvbmFsLlxuICAgKiBAZGVmYXVsdCB7U3RyaW5nfSAnJyAtIGlmIG5vIHBsdWdpbiBuYW1lIGlzIHByb3ZpZGVkLCBub3RoaW5nIGlzIGFwcGVuZGVkIHRvIHRoZSB1aWQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IC0gdW5pcXVlIGlkXG4gICAqL1xuICBHZXRZb0RpZ2l0czogZnVuY3Rpb24obGVuZ3RoLCBuYW1lc3BhY2Upe1xuICAgIGxlbmd0aCA9IGxlbmd0aCB8fCA2O1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnBvdygzNiwgbGVuZ3RoICsgMSkgLSBNYXRoLnJhbmRvbSgpICogTWF0aC5wb3coMzYsIGxlbmd0aCkpKS50b1N0cmluZygzNikuc2xpY2UoMSkgKyAobmFtZXNwYWNlID8gYC0ke25hbWVzcGFjZX1gIDogJycpO1xuICB9LFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBwbHVnaW5zIG9uIGFueSBlbGVtZW50cyB3aXRoaW4gYGVsZW1gIChhbmQgYGVsZW1gIGl0c2VsZikgdGhhdCBhcmVuJ3QgYWxyZWFkeSBpbml0aWFsaXplZC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnQgdG8gY2hlY2sgaW5zaWRlLiBBbHNvIGNoZWNrcyB0aGUgZWxlbWVudCBpdHNlbGYsIHVubGVzcyBpdCdzIHRoZSBgZG9jdW1lbnRgIG9iamVjdC5cbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHBsdWdpbnMgLSBBIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplLiBMZWF2ZSB0aGlzIG91dCB0byBpbml0aWFsaXplIGV2ZXJ5dGhpbmcuXG4gICAqL1xuICByZWZsb3c6IGZ1bmN0aW9uKGVsZW0sIHBsdWdpbnMpIHtcblxuICAgIC8vIElmIHBsdWdpbnMgaXMgdW5kZWZpbmVkLCBqdXN0IGdyYWIgZXZlcnl0aGluZ1xuICAgIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHBsdWdpbnMgPSBPYmplY3Qua2V5cyh0aGlzLl9wbHVnaW5zKTtcbiAgICB9XG4gICAgLy8gSWYgcGx1Z2lucyBpcyBhIHN0cmluZywgY29udmVydCBpdCB0byBhbiBhcnJheSB3aXRoIG9uZSBpdGVtXG4gICAgZWxzZSBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBwbHVnaW5zID0gW3BsdWdpbnNdO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBwbHVnaW5cbiAgICAkLmVhY2gocGx1Z2lucywgZnVuY3Rpb24oaSwgbmFtZSkge1xuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IHBsdWdpblxuICAgICAgdmFyIHBsdWdpbiA9IF90aGlzLl9wbHVnaW5zW25hbWVdO1xuXG4gICAgICAvLyBMb2NhbGl6ZSB0aGUgc2VhcmNoIHRvIGFsbCBlbGVtZW50cyBpbnNpZGUgZWxlbSwgYXMgd2VsbCBhcyBlbGVtIGl0c2VsZiwgdW5sZXNzIGVsZW0gPT09IGRvY3VtZW50XG4gICAgICB2YXIgJGVsZW0gPSAkKGVsZW0pLmZpbmQoJ1tkYXRhLScrbmFtZSsnXScpLmFkZEJhY2soJ1tkYXRhLScrbmFtZSsnXScpO1xuXG4gICAgICAvLyBGb3IgZWFjaCBwbHVnaW4gZm91bmQsIGluaXRpYWxpemUgaXRcbiAgICAgICRlbGVtLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciAkZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgICAvLyBEb24ndCBkb3VibGUtZGlwIG9uIHBsdWdpbnNcbiAgICAgICAgaWYgKCRlbC5kYXRhKCd6ZlBsdWdpbicpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiVHJpZWQgdG8gaW5pdGlhbGl6ZSBcIituYW1lK1wiIG9uIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGhhcyBhIEZvdW5kYXRpb24gcGx1Z2luLlwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZigkZWwuYXR0cignZGF0YS1vcHRpb25zJykpe1xuICAgICAgICAgIHZhciB0aGluZyA9ICRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKS5zcGxpdCgnOycpLmZvckVhY2goZnVuY3Rpb24oZSwgaSl7XG4gICAgICAgICAgICB2YXIgb3B0ID0gZS5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihlbCl7IHJldHVybiBlbC50cmltKCk7IH0pO1xuICAgICAgICAgICAgaWYob3B0WzBdKSBvcHRzW29wdFswXV0gPSBwYXJzZVZhbHVlKG9wdFsxXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICRlbC5kYXRhKCd6ZlBsdWdpbicsIG5ldyBwbHVnaW4oJCh0aGlzKSwgb3B0cykpO1xuICAgICAgICB9Y2F0Y2goZXIpe1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXIpO1xuICAgICAgICB9ZmluYWxseXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBnZXRGbk5hbWU6IGZ1bmN0aW9uTmFtZSxcbiAgdHJhbnNpdGlvbmVuZDogZnVuY3Rpb24oJGVsZW0pe1xuICAgIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAgICd0cmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdPVHJhbnNpdGlvbic6ICdvdHJhbnNpdGlvbmVuZCdcbiAgICB9O1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgIGVuZDtcblxuICAgIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpe1xuICAgICAgaWYgKHR5cGVvZiBlbGVtLnN0eWxlW3RdICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIGVuZCA9IHRyYW5zaXRpb25zW3RdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihlbmQpe1xuICAgICAgcmV0dXJuIGVuZDtcbiAgICB9ZWxzZXtcbiAgICAgIGVuZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJGVsZW0udHJpZ2dlckhhbmRsZXIoJ3RyYW5zaXRpb25lbmQnLCBbJGVsZW1dKTtcbiAgICAgIH0sIDEpO1xuICAgICAgcmV0dXJuICd0cmFuc2l0aW9uZW5kJztcbiAgICB9XG4gIH1cbn07XG5cbkZvdW5kYXRpb24udXRpbCA9IHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBhcHBseWluZyBhIGRlYm91bmNlIGVmZmVjdCB0byBhIGZ1bmN0aW9uIGNhbGwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gRnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IGVuZCBvZiB0aW1lb3V0LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgLSBUaW1lIGluIG1zIHRvIGRlbGF5IHRoZSBjYWxsIG9mIGBmdW5jYC5cbiAgICogQHJldHVybnMgZnVuY3Rpb25cbiAgICovXG4gIHRocm90dGxlOiBmdW5jdGlvbiAoZnVuYywgZGVsYXkpIHtcbiAgICB2YXIgdGltZXIgPSBudWxsO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgaWYgKHRpbWVyID09PSBudWxsKSB7XG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICB0aW1lciA9IG51bGw7XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59O1xuXG4vLyBUT0RPOiBjb25zaWRlciBub3QgbWFraW5nIHRoaXMgYSBqUXVlcnkgZnVuY3Rpb25cbi8vIFRPRE86IG5lZWQgd2F5IHRvIHJlZmxvdyB2cy4gcmUtaW5pdGlhbGl6ZVxuLyoqXG4gKiBUaGUgRm91bmRhdGlvbiBqUXVlcnkgbWV0aG9kLlxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG1ldGhvZCAtIEFuIGFjdGlvbiB0byBwZXJmb3JtIG9uIHRoZSBjdXJyZW50IGpRdWVyeSBvYmplY3QuXG4gKi9cbnZhciBmb3VuZGF0aW9uID0gZnVuY3Rpb24obWV0aG9kKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIG1ldGhvZCxcbiAgICAgICRtZXRhID0gJCgnbWV0YS5mb3VuZGF0aW9uLW1xJyksXG4gICAgICAkbm9KUyA9ICQoJy5uby1qcycpO1xuXG4gIGlmKCEkbWV0YS5sZW5ndGgpe1xuICAgICQoJzxtZXRhIGNsYXNzPVwiZm91bmRhdGlvbi1tcVwiPicpLmFwcGVuZFRvKGRvY3VtZW50LmhlYWQpO1xuICB9XG4gIGlmKCRub0pTLmxlbmd0aCl7XG4gICAgJG5vSlMucmVtb3ZlQ2xhc3MoJ25vLWpzJyk7XG4gIH1cblxuICBpZih0eXBlID09PSAndW5kZWZpbmVkJyl7Ly9uZWVkcyB0byBpbml0aWFsaXplIHRoZSBGb3VuZGF0aW9uIG9iamVjdCwgb3IgYW4gaW5kaXZpZHVhbCBwbHVnaW4uXG4gICAgRm91bmRhdGlvbi5NZWRpYVF1ZXJ5Ll9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWZsb3codGhpcyk7XG4gIH1lbHNlIGlmKHR5cGUgPT09ICdzdHJpbmcnKXsvL2FuIGluZGl2aWR1YWwgbWV0aG9kIHRvIGludm9rZSBvbiBhIHBsdWdpbiBvciBncm91cCBvZiBwbHVnaW5zXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpOy8vY29sbGVjdCBhbGwgdGhlIGFyZ3VtZW50cywgaWYgbmVjZXNzYXJ5XG4gICAgdmFyIHBsdWdDbGFzcyA9IHRoaXMuZGF0YSgnemZQbHVnaW4nKTsvL2RldGVybWluZSB0aGUgY2xhc3Mgb2YgcGx1Z2luXG5cbiAgICBpZihwbHVnQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBwbHVnQ2xhc3NbbWV0aG9kXSAhPT0gdW5kZWZpbmVkKXsvL21ha2Ugc3VyZSBib3RoIHRoZSBjbGFzcyBhbmQgbWV0aG9kIGV4aXN0XG4gICAgICBpZih0aGlzLmxlbmd0aCA9PT0gMSl7Ly9pZiB0aGVyZSdzIG9ubHkgb25lLCBjYWxsIGl0IGRpcmVjdGx5LlxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KHBsdWdDbGFzcywgYXJncyk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksIGVsKXsvL290aGVyd2lzZSBsb29wIHRocm91Z2ggdGhlIGpRdWVyeSBjb2xsZWN0aW9uIGFuZCBpbnZva2UgdGhlIG1ldGhvZCBvbiBlYWNoXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkoJChlbCkuZGF0YSgnemZQbHVnaW4nKSwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1lbHNley8vZXJyb3IgZm9yIG5vIGNsYXNzIG9yIG5vIG1ldGhvZFxuICAgICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwiV2UncmUgc29ycnksICdcIiArIG1ldGhvZCArIFwiJyBpcyBub3QgYW4gYXZhaWxhYmxlIG1ldGhvZCBmb3IgXCIgKyAocGx1Z0NsYXNzID8gZnVuY3Rpb25OYW1lKHBsdWdDbGFzcykgOiAndGhpcyBlbGVtZW50JykgKyAnLicpO1xuICAgIH1cbiAgfWVsc2V7Ly9lcnJvciBmb3IgaW52YWxpZCBhcmd1bWVudCB0eXBlXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgV2UncmUgc29ycnksICR7dHlwZX0gaXMgbm90IGEgdmFsaWQgcGFyYW1ldGVyLiBZb3UgbXVzdCB1c2UgYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtZXRob2QgeW91IHdpc2ggdG8gaW52b2tlLmApO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxud2luZG93LkZvdW5kYXRpb24gPSBGb3VuZGF0aW9uO1xuJC5mbi5mb3VuZGF0aW9uID0gZm91bmRhdGlvbjtcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93IHx8ICF3aW5kb3cuRGF0ZS5ub3cpXG4gICAgd2luZG93LkRhdGUubm93ID0gRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG4gIC8qKlxuICAgKiBQb2x5ZmlsbCBmb3IgcGVyZm9ybWFuY2Uubm93LCByZXF1aXJlZCBieSByQUZcbiAgICovXG4gIGlmKCF3aW5kb3cucGVyZm9ybWFuY2UgfHwgIXdpbmRvdy5wZXJmb3JtYW5jZS5ub3cpe1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICAgIHN0YXJ0OiBEYXRlLm5vdygpLFxuICAgICAgbm93OiBmdW5jdGlvbigpeyByZXR1cm4gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnQ7IH1cbiAgICB9O1xuICB9XG59KSgpO1xuaWYgKCFGdW5jdGlvbi5wcm90b3R5cGUuYmluZCkge1xuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKG9UaGlzKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBjbG9zZXN0IHRoaW5nIHBvc3NpYmxlIHRvIHRoZSBFQ01BU2NyaXB0IDVcbiAgICAgIC8vIGludGVybmFsIElzQ2FsbGFibGUgZnVuY3Rpb25cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICBmVG9CaW5kID0gdGhpcyxcbiAgICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgIGZCb3VuZCAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZlRvQmluZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgZk5PUFxuICAgICAgICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgICAgICAgOiBvVGhpcyxcbiAgICAgICAgICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcblxuICAgIGlmICh0aGlzLnByb3RvdHlwZSkge1xuICAgICAgLy8gbmF0aXZlIGZ1bmN0aW9ucyBkb24ndCBoYXZlIGEgcHJvdG90eXBlXG4gICAgICBmTk9QLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIH1cbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IGZOT1AoKTtcblxuICAgIHJldHVybiBmQm91bmQ7XG4gIH07XG59XG4vLyBQb2x5ZmlsbCB0byBnZXQgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbiBpbiBJRTlcbmZ1bmN0aW9uIGZ1bmN0aW9uTmFtZShmbikge1xuICBpZiAoRnVuY3Rpb24ucHJvdG90eXBlLm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBmdW5jTmFtZVJlZ2V4ID0gL2Z1bmN0aW9uXFxzKFteKF17MSx9KVxcKC87XG4gICAgdmFyIHJlc3VsdHMgPSAoZnVuY05hbWVSZWdleCkuZXhlYygoZm4pLnRvU3RyaW5nKCkpO1xuICAgIHJldHVybiAocmVzdWx0cyAmJiByZXN1bHRzLmxlbmd0aCA+IDEpID8gcmVzdWx0c1sxXS50cmltKCkgOiBcIlwiO1xuICB9XG4gIGVsc2UgaWYgKGZuLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZuLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGZuLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG59XG5mdW5jdGlvbiBwYXJzZVZhbHVlKHN0cil7XG4gIGlmKC90cnVlLy50ZXN0KHN0cikpIHJldHVybiB0cnVlO1xuICBlbHNlIGlmKC9mYWxzZS8udGVzdChzdHIpKSByZXR1cm4gZmFsc2U7XG4gIGVsc2UgaWYoIWlzTmFOKHN0ciAqIDEpKSByZXR1cm4gcGFyc2VGbG9hdChzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuLy8gQ29udmVydCBQYXNjYWxDYXNlIHRvIGtlYmFiLWNhc2Vcbi8vIFRoYW5rIHlvdTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODk1NTU4MFxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuRm91bmRhdGlvbi5Cb3ggPSB7XG4gIEltTm90VG91Y2hpbmdZb3U6IEltTm90VG91Y2hpbmdZb3UsXG4gIEdldERpbWVuc2lvbnM6IEdldERpbWVuc2lvbnMsXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50IHRvIGEgY29udGFpbmVyIGFuZCBkZXRlcm1pbmVzIGNvbGxpc2lvbiBldmVudHMgd2l0aCBjb250YWluZXIuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxuICogQHBhcmFtIHtqUXVlcnl9IHBhcmVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIGJvdW5kaW5nIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbHJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgbGVmdCBhbmQgcmlnaHQgdmFsdWVzIG9ubHkuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxuICogQGRlZmF1bHQgaWYgbm8gcGFyZW50IG9iamVjdCBwYXNzZWQsIGRldGVjdHMgY29sbGlzaW9ucyB3aXRoIGB3aW5kb3dgLlxuICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiBjb2xsaXNpb24gZnJlZSwgZmFsc2UgaWYgYSBjb2xsaXNpb24gaW4gYW55IGRpcmVjdGlvbi5cbiAqL1xuZnVuY3Rpb24gSW1Ob3RUb3VjaGluZ1lvdShlbGVtZW50LCBwYXJlbnQsIGxyT25seSwgdGJPbmx5KSB7XG4gIHZhciBlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcblxuICBpZiAocGFyZW50KSB7XG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XG5cbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gcGFyRGltcy5oZWlnaHQgKyBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gcGFyRGltcy53aWR0aCArIHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0ICsgZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IGVsZURpbXMud2luZG93RGltcy53aWR0aCk7XG4gIH1cblxuICB2YXIgYWxsRGlycyA9IFtib3R0b20sIHRvcCwgbGVmdCwgcmlnaHRdO1xuXG4gIGlmIChsck9ubHkpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgPT09IHRydWU7XG4gIH1cblxuICBpZiAodGJPbmx5KSB7XG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xufTtcblxuLyoqXG4gKiBVc2VzIG5hdGl2ZSBtZXRob2RzIHRvIHJldHVybiBhbiBvYmplY3Qgb2YgZGltZW5zaW9uIHZhbHVlcy5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxuICogQHJldHVybnMge09iamVjdH0gLSBuZXN0ZWQgb2JqZWN0IG9mIGludGVnZXIgcGl4ZWwgdmFsdWVzXG4gKiBUT0RPIC0gaWYgZWxlbWVudCBpcyB3aW5kb3csIHJldHVybiBvbmx5IHRob3NlIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gR2V0RGltZW5zaW9ucyhlbGVtLCB0ZXN0KXtcbiAgZWxlbSA9IGVsZW0ubGVuZ3RoID8gZWxlbVswXSA6IGVsZW07XG5cbiAgaWYgKGVsZW0gPT09IHdpbmRvdyB8fCBlbGVtID09PSBkb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBzb3JyeSwgRGF2ZS4gSSdtIGFmcmFpZCBJIGNhbid0IGRvIHRoYXQuXCIpO1xuICB9XG5cbiAgdmFyIHJlY3QgPSBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblJlY3QgPSBkb2N1bWVudC5ib2R5LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIG9mZnNldDoge1xuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXG4gICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5YXG4gICAgfSxcbiAgICBwYXJlbnREaW1zOiB7XG4gICAgICB3aWR0aDogcGFyUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcGFyUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiBwYXJSZWN0LnRvcCArIHdpblksXG4gICAgICAgIGxlZnQ6IHBhclJlY3QubGVmdCArIHdpblhcbiAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd0RpbXM6IHtcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5SZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHdpblksXG4gICAgICAgIGxlZnQ6IHdpblhcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0b3AgYW5kIGxlZnQgaW50ZWdlciBwaXhlbCB2YWx1ZXMgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmVkIGVsZW1lbnRzLFxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCBiZWluZyBwb3NpdGlvbmVkLlxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gYSBzdHJpbmcgcmVsYXRpbmcgdG8gdGhlIGRlc2lyZWQgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQsIHJlbGF0aXZlIHRvIGl0J3MgYW5jaG9yXG4gKiBAcGFyYW0ge051bWJlcn0gdk9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCB2ZXJ0aWNhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBpc092ZXJmbG93IC0gaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQsIHNldHMgdG8gdHJ1ZSB0byBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIGZ1bGwgd2lkdGggLSBhbnkgZGVzaXJlZCBvZmZzZXQuXG4gKiBUT0RPIGFsdGVyL3Jld3JpdGUgdG8gd29yayB3aXRoIGBlbWAgdmFsdWVzIGFzIHdlbGwvaW5zdGVhZCBvZiBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gR2V0T2Zmc2V0cyhlbGVtZW50LCBhbmNob3IsIHBvc2l0aW9uLCB2T2Zmc2V0LCBoT2Zmc2V0LCBpc092ZXJmbG93KSB7XG4gIHZhciAkZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XG5cbiAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGlzT3ZlcmZsb3cgPyBoT2Zmc2V0IDogKCgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCArIDEsXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQgKyAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JldmVhbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICRlbGVEaW1zLndpZHRoKSAvIDIsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxuICAgICAgfVxuICAgIGNhc2UgJ3JldmVhbCBmdWxsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0IC0gJGVsZURpbXMud2lkdGgsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgfVxufVxuXG59KGpRdWVyeSk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqIFRoaXMgdXRpbCB3YXMgY3JlYXRlZCBieSBNYXJpdXMgT2xiZXJ0eiAqXG4gKiBQbGVhc2UgdGhhbmsgTWFyaXVzIG9uIEdpdEh1YiAvb3dsYmVydHogKlxuICogb3IgdGhlIHdlYiBodHRwOi8vd3d3Lm1hcml1c29sYmVydHouZGUvICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IGtleUNvZGVzID0ge1xuICA5OiAnVEFCJyxcbiAgMTM6ICdFTlRFUicsXG4gIDI3OiAnRVNDQVBFJyxcbiAgMzI6ICdTUEFDRScsXG4gIDM3OiAnQVJST1dfTEVGVCcsXG4gIDM4OiAnQVJST1dfVVAnLFxuICAzOTogJ0FSUk9XX1JJR0hUJyxcbiAgNDA6ICdBUlJPV19ET1dOJ1xufVxuXG52YXIgY29tbWFuZHMgPSB7fVxuXG52YXIgS2V5Ym9hcmQgPSB7XG4gIGtleXM6IGdldEtleUNvZGVzKGtleUNvZGVzKSxcblxuICAvKipcbiAgICogUGFyc2VzIHRoZSAoa2V5Ym9hcmQpIGV2ZW50IGFuZCByZXR1cm5zIGEgU3RyaW5nIHRoYXQgcmVwcmVzZW50cyBpdHMga2V5XG4gICAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHJldHVybiBTdHJpbmcga2V5IC0gU3RyaW5nIHRoYXQgcmVwcmVzZW50cyB0aGUga2V5IHByZXNzZWRcbiAgICovXG4gIHBhcnNlS2V5KGV2ZW50KSB7XG4gICAgdmFyIGtleSA9IGtleUNvZGVzW2V2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGVdIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSBrZXkgPSBgU0hJRlRfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuY3RybEtleSkga2V5ID0gYENUUkxfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuYWx0S2V5KSBrZXkgPSBgQUxUXyR7a2V5fWA7XG4gICAgcmV0dXJuIGtleTtcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgZ2l2ZW4gKGtleWJvYXJkKSBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50J3MgbmFtZSwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEBwYXJhbSB7T2JqZWN0c30gZnVuY3Rpb25zIC0gY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgdG8gYmUgZXhlY3V0ZWRcbiAgICovXG4gIGhhbmRsZUtleShldmVudCwgY29tcG9uZW50LCBmdW5jdGlvbnMpIHtcbiAgICB2YXIgY29tbWFuZExpc3QgPSBjb21tYW5kc1tjb21wb25lbnRdLFxuICAgICAga2V5Q29kZSA9IHRoaXMucGFyc2VLZXkoZXZlbnQpLFxuICAgICAgY21kcyxcbiAgICAgIGNvbW1hbmQsXG4gICAgICBmbjtcblxuICAgIGlmICghY29tbWFuZExpc3QpIHJldHVybiBjb25zb2xlLndhcm4oJ0NvbXBvbmVudCBub3QgZGVmaW5lZCEnKTtcblxuICAgIGlmICh0eXBlb2YgY29tbWFuZExpc3QubHRyID09PSAndW5kZWZpbmVkJykgeyAvLyB0aGlzIGNvbXBvbmVudCBkb2VzIG5vdCBkaWZmZXJlbnRpYXRlIGJldHdlZW4gbHRyIGFuZCBydGxcbiAgICAgICAgY21kcyA9IGNvbW1hbmRMaXN0OyAvLyB1c2UgcGxhaW4gbGlzdFxuICAgIH0gZWxzZSB7IC8vIG1lcmdlIGx0ciBhbmQgcnRsOiBpZiBkb2N1bWVudCBpcyBydGwsIHJ0bCBvdmVyd3JpdGVzIGx0ciBhbmQgdmljZSB2ZXJzYVxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5sdHIsIGNvbW1hbmRMaXN0LnJ0bCk7XG5cbiAgICAgICAgZWxzZSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0LnJ0bCwgY29tbWFuZExpc3QubHRyKTtcbiAgICB9XG4gICAgY29tbWFuZCA9IGNtZHNba2V5Q29kZV07XG5cbiAgICBmbiA9IGZ1bmN0aW9uc1tjb21tYW5kXTtcbiAgICBpZiAoZm4gJiYgdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gIGlmIGV4aXN0c1xuICAgICAgdmFyIHJldHVyblZhbHVlID0gZm4uYXBwbHkoKTtcbiAgICAgIGlmIChmdW5jdGlvbnMuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLmhhbmRsZWQocmV0dXJuVmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZnVuY3Rpb25zLnVuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLnVuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIG5vdCBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLnVuaGFuZGxlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogRmluZHMgYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gdGhlIGdpdmVuIGAkZWxlbWVudGBcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBzZWFyY2ggd2l0aGluXG4gICAqIEByZXR1cm4ge2pRdWVyeX0gJGZvY3VzYWJsZSAtIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIGAkZWxlbWVudGBcbiAgICovXG4gIGZpbmRGb2N1c2FibGUoJGVsZW1lbnQpIHtcbiAgICByZXR1cm4gJGVsZW1lbnQuZmluZCgnYVtocmVmXSwgYXJlYVtocmVmXSwgaW5wdXQ6bm90KFtkaXNhYmxlZF0pLCBzZWxlY3Q6bm90KFtkaXNhYmxlZF0pLCB0ZXh0YXJlYTpub3QoW2Rpc2FibGVkXSksIGJ1dHRvbjpub3QoW2Rpc2FibGVkXSksIGlmcmFtZSwgb2JqZWN0LCBlbWJlZCwgKlt0YWJpbmRleF0sICpbY29udGVudGVkaXRhYmxlXScpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIGlmICghJCh0aGlzKS5pcygnOnZpc2libGUnKSB8fCAkKHRoaXMpLmF0dHIoJ3RhYmluZGV4JykgPCAwKSB7IHJldHVybiBmYWxzZTsgfSAvL29ubHkgaGF2ZSB2aXNpYmxlIGVsZW1lbnRzIGFuZCB0aG9zZSB0aGF0IGhhdmUgYSB0YWJpbmRleCBncmVhdGVyIG9yIGVxdWFsIDBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb21wb25lbnQgbmFtZSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEByZXR1cm4gU3RyaW5nIGNvbXBvbmVudE5hbWVcbiAgICovXG5cbiAgcmVnaXN0ZXIoY29tcG9uZW50TmFtZSwgY21kcykge1xuICAgIGNvbW1hbmRzW2NvbXBvbmVudE5hbWVdID0gY21kcztcbiAgfVxufVxuXG4vKlxuICogQ29uc3RhbnRzIGZvciBlYXNpZXIgY29tcGFyaW5nLlxuICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gKi9cbmZ1bmN0aW9uIGdldEtleUNvZGVzKGtjcykge1xuICB2YXIgayA9IHt9O1xuICBmb3IgKHZhciBrYyBpbiBrY3MpIGtba2NzW2tjXV0gPSBrY3Nba2NdO1xuICByZXR1cm4gaztcbn1cblxuRm91bmRhdGlvbi5LZXlib2FyZCA9IEtleWJvYXJkO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8vIERlZmF1bHQgc2V0IG9mIG1lZGlhIHF1ZXJpZXNcbmNvbnN0IGRlZmF1bHRRdWVyaWVzID0ge1xuICAnZGVmYXVsdCcgOiAnb25seSBzY3JlZW4nLFxuICBsYW5kc2NhcGUgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gIHBvcnRyYWl0IDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gIHJldGluYSA6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG52YXIgTWVkaWFRdWVyeSA9IHtcbiAgcXVlcmllczogW10sXG5cbiAgY3VycmVudDogJycsXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtZWRpYSBxdWVyeSBoZWxwZXIsIGJ5IGV4dHJhY3RpbmcgdGhlIGJyZWFrcG9pbnQgbGlzdCBmcm9tIHRoZSBDU1MgYW5kIGFjdGl2YXRpbmcgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGV4dHJhY3RlZFN0eWxlcyA9ICQoJy5mb3VuZGF0aW9uLW1xJykuY3NzKCdmb250LWZhbWlseScpO1xuICAgIHZhciBuYW1lZFF1ZXJpZXM7XG5cbiAgICBuYW1lZFF1ZXJpZXMgPSBwYXJzZVN0eWxlVG9PYmplY3QoZXh0cmFjdGVkU3R5bGVzKTtcblxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lZFF1ZXJpZXMpIHtcbiAgICAgIGlmKG5hbWVkUXVlcmllcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHNlbGYucXVlcmllcy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgdmFsdWU6IGBvbmx5IHNjcmVlbiBhbmQgKG1pbi13aWR0aDogJHtuYW1lZFF1ZXJpZXNba2V5XX0pYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpO1xuXG4gICAgdGhpcy5fd2F0Y2hlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHNjcmVlbiBpcyBhdCBsZWFzdCBhcyB3aWRlIGFzIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0J3Mgc21hbGxlci5cbiAgICovXG4gIGF0TGVhc3Qoc2l6ZSkge1xuICAgIHZhciBxdWVyeSA9IHRoaXMuZ2V0KHNpemUpO1xuXG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICByZXR1cm4gd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpLm1hdGNoZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBtZWRpYSBxdWVyeSBvZiBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfG51bGx9IC0gVGhlIG1lZGlhIHF1ZXJ5IG9mIHRoZSBicmVha3BvaW50LCBvciBgbnVsbGAgaWYgdGhlIGJyZWFrcG9pbnQgZG9lc24ndCBleGlzdC5cbiAgICovXG4gIGdldChzaXplKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJpZXMpIHtcbiAgICAgIGlmKHRoaXMucXVlcmllcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG4gICAgICAgIGlmIChzaXplID09PSBxdWVyeS5uYW1lKSByZXR1cm4gcXVlcnkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCBuYW1lIGJ5IHRlc3RpbmcgZXZlcnkgYnJlYWtwb2ludCBhbmQgcmV0dXJuaW5nIHRoZSBsYXN0IG9uZSB0byBtYXRjaCAodGhlIGJpZ2dlc3Qgb25lKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGN1cnJlbnQgYnJlYWtwb2ludC5cbiAgICovXG4gIF9nZXRDdXJyZW50U2l6ZSgpIHtcbiAgICB2YXIgbWF0Y2hlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5xdWVyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG5cbiAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShxdWVyeS52YWx1ZSkubWF0Y2hlcykge1xuICAgICAgICBtYXRjaGVkID0gcXVlcnk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG1hdGNoZWQubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBY3RpdmF0ZXMgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlciwgd2hpY2ggZmlyZXMgYW4gZXZlbnQgb24gdGhlIHdpbmRvdyB3aGVuZXZlciB0aGUgYnJlYWtwb2ludCBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF93YXRjaGVyKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLm1lZGlhcXVlcnknLCAoKSA9PiB7XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCksIGN1cnJlbnRTaXplID0gdGhpcy5jdXJyZW50O1xuXG4gICAgICBpZiAobmV3U2l6ZSAhPT0gY3VycmVudFNpemUpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG5ld1NpemU7XG5cbiAgICAgICAgLy8gQnJvYWRjYXN0IHRoZSBtZWRpYSBxdWVyeSBjaGFuZ2Ugb24gdGhlIHdpbmRvd1xuICAgICAgICAkKHdpbmRvdykudHJpZ2dlcignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgW25ld1NpemUsIGN1cnJlbnRTaXplXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbi8vIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy5cbi8vIEF1dGhvcnMgJiBjb3B5cmlnaHQgKGMpIDIwMTI6IFNjb3R0IEplaGwsIFBhdWwgSXJpc2gsIE5pY2hvbGFzIFpha2FzLCBEYXZpZCBLbmlnaHQuIER1YWwgTUlUL0JTRCBsaWNlbnNlXG53aW5kb3cubWF0Y2hNZWRpYSB8fCAod2luZG93Lm1hdGNoTWVkaWEgPSBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgbWF0Y2hNZWRpdW0gYXBpIHN1Y2ggYXMgSUUgOSBhbmQgd2Via2l0XG4gIHZhciBzdHlsZU1lZGlhID0gKHdpbmRvdy5zdHlsZU1lZGlhIHx8IHdpbmRvdy5tZWRpYSk7XG5cbiAgLy8gRm9yIHRob3NlIHRoYXQgZG9uJ3Qgc3VwcG9ydCBtYXRjaE1lZGl1bVxuICBpZiAoIXN0eWxlTWVkaWEpIHtcbiAgICB2YXIgc3R5bGUgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyksXG4gICAgc2NyaXB0ICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0sXG4gICAgaW5mbyAgICAgICAgPSBudWxsO1xuXG4gICAgc3R5bGUudHlwZSAgPSAndGV4dC9jc3MnO1xuICAgIHN0eWxlLmlkICAgID0gJ21hdGNobWVkaWFqcy10ZXN0JztcblxuICAgIHNjcmlwdCAmJiBzY3JpcHQucGFyZW50Tm9kZSAmJiBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7XG5cbiAgICAvLyAnc3R5bGUuY3VycmVudFN0eWxlJyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICd3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZScgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgIGluZm8gPSAoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgJiYgd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3R5bGUsIG51bGwpIHx8IHN0eWxlLmN1cnJlbnRTdHlsZTtcblxuICAgIHN0eWxlTWVkaWEgPSB7XG4gICAgICBtYXRjaE1lZGl1bShtZWRpYSkge1xuICAgICAgICB2YXIgdGV4dCA9IGBAbWVkaWEgJHttZWRpYX17ICNtYXRjaG1lZGlhanMtdGVzdCB7IHdpZHRoOiAxcHg7IH0gfWA7XG5cbiAgICAgICAgLy8gJ3N0eWxlLnN0eWxlU2hlZXQnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3N0eWxlLnRleHRDb250ZW50JyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gdGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZXN0IGlmIG1lZGlhIHF1ZXJ5IGlzIHRydWUgb3IgZmFsc2VcbiAgICAgICAgcmV0dXJuIGluZm8ud2lkdGggPT09ICcxcHgnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihtZWRpYSkge1xuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVzOiBzdHlsZU1lZGlhLm1hdGNoTWVkaXVtKG1lZGlhIHx8ICdhbGwnKSxcbiAgICAgIG1lZGlhOiBtZWRpYSB8fCAnYWxsJ1xuICAgIH07XG4gIH1cbn0oKSk7XG5cbi8vIFRoYW5rIHlvdTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmdcbmZ1bmN0aW9uIHBhcnNlU3R5bGVUb09iamVjdChzdHIpIHtcbiAgdmFyIHN0eWxlT2JqZWN0ID0ge307XG5cbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3RyID0gc3RyLnRyaW0oKS5zbGljZSgxLCAtMSk7IC8vIGJyb3dzZXJzIHJlLXF1b3RlIHN0cmluZyBzdHlsZSB2YWx1ZXNcblxuICBpZiAoIXN0cikge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0eWxlT2JqZWN0ID0gc3RyLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHJldCwgcGFyYW0pIHtcbiAgICB2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuICAgIHZhciBrZXkgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsID0gcGFydHNbMV07XG4gICAga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cbiAgICAvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuICAgIC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcbiAgICB2YWwgPSB2YWwgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBkZWNvZGVVUklDb21wb25lbnQodmFsKTtcblxuICAgIGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldFtrZXldID0gdmFsO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXRba2V5XSkpIHtcbiAgICAgIHJldFtrZXldLnB1c2godmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0W2tleV0gPSBbcmV0W2tleV0sIHZhbF07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sIHt9KTtcblxuICByZXR1cm4gc3R5bGVPYmplY3Q7XG59XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNb3Rpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1vdGlvblxuICovXG5cbmNvbnN0IGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbmNvbnN0IGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG5jb25zdCBNb3Rpb24gPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIE1vdmUoZHVyYXRpb24sIGVsZW0sIGZuKXtcbiAgdmFyIGFuaW0sIHByb2csIHN0YXJ0ID0gbnVsbDtcbiAgLy8gY29uc29sZS5sb2coJ2NhbGxlZCcpO1xuXG4gIGZ1bmN0aW9uIG1vdmUodHMpe1xuICAgIGlmKCFzdGFydCkgc3RhcnQgPSB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG4gICAgLy8gY29uc29sZS5sb2coc3RhcnQsIHRzKTtcbiAgICBwcm9nID0gdHMgLSBzdGFydDtcbiAgICBmbi5hcHBseShlbGVtKTtcblxuICAgIGlmKHByb2cgPCBkdXJhdGlvbil7IGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUsIGVsZW0pOyB9XG4gICAgZWxzZXtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShhbmltKTtcbiAgICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xuICAgIH1cbiAgfVxuICBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlKTtcbn1cblxuLyoqXG4gKiBBbmltYXRlcyBhbiBlbGVtZW50IGluIG9yIG91dCB1c2luZyBhIENTUyB0cmFuc2l0aW9uIGNsYXNzLlxuICogQGZ1bmN0aW9uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtCb29sZWFufSBpc0luIC0gRGVmaW5lcyBpZiB0aGUgYW5pbWF0aW9uIGlzIGluIG9yIG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9yIEhUTUwgb2JqZWN0IHRvIGFuaW1hdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gYW5pbWF0aW9uIC0gQ1NTIGNsYXNzIHRvIHVzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQ2FsbGJhY2sgdG8gcnVuIHdoZW4gYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICovXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBpbml0Q2xhc3MgPSBpc0luID8gaW5pdENsYXNzZXNbMF0gOiBpbml0Q2xhc3Nlc1sxXTtcbiAgdmFyIGFjdGl2ZUNsYXNzID0gaXNJbiA/IGFjdGl2ZUNsYXNzZXNbMF0gOiBhY3RpdmVDbGFzc2VzWzFdO1xuXG4gIC8vIFNldCB1cCB0aGUgYW5pbWF0aW9uXG4gIHJlc2V0KCk7XG5cbiAgZWxlbWVudFxuICAgIC5hZGRDbGFzcyhhbmltYXRpb24pXG4gICAgLmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG5cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudFswXS5vZmZzZXRXaWR0aDtcbiAgICBlbGVtZW50XG4gICAgICAuY3NzKCd0cmFuc2l0aW9uJywgJycpXG4gICAgICAuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKGVsZW1lbnQpLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGAke2luaXRDbGFzc30gJHthY3RpdmVDbGFzc30gJHthbmltYXRpb259YCk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5Nb3ZlID0gTW92ZTtcbkZvdW5kYXRpb24uTW90aW9uID0gTW90aW9uO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE5lc3QgPSB7XG4gIEZlYXRoZXIobWVudSwgdHlwZSA9ICd6ZicpIHtcbiAgICBtZW51LmF0dHIoJ3JvbGUnLCAnbWVudWJhcicpO1xuXG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLmF0dHIoeydyb2xlJzogJ21lbnVpdGVtJ30pLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBtZW51LmZpbmQoJ2E6Zmlyc3QnKS5hdHRyKCd0YWJpbmRleCcsIDApO1xuXG4gICAgaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuXG4gICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW1cbiAgICAgICAgICAuYWRkQ2xhc3MoaGFzU3ViQ2xhc3MpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdhcmlhLWxhYmVsJzogJGl0ZW0uY2hpbGRyZW4oJ2E6Zmlyc3QnKS50ZXh0KClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAkc3ViXG4gICAgICAgICAgLmFkZENsYXNzKGBzdWJtZW51ICR7c3ViTWVudUNsYXNzfWApXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2RhdGEtc3VibWVudSc6ICcnLFxuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgICAgICdyb2xlJzogJ21lbnUnXG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICgkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgQnVybihtZW51LCB0eXBlKSB7XG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLnJlbW92ZUF0dHIoJ3RhYmluZGV4JyksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnVcbiAgICAgIC5maW5kKCc+bGksIC5tZW51LCAubWVudSA+IGxpJylcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxuICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpLmNzcygnZGlzcGxheScsICcnKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUNsYXNzKHN1Yk1lbnVDbGFzcyArICcgJyArIHN1Ykl0ZW1DbGFzcyArICcgaGFzLXN1Ym1lbnUgaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUnKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykpO1xuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAvLyAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgLy8gICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdpcy1zdWJtZW51LWl0ZW0gJyArIHN1Ykl0ZW1DbGFzcyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdoYXMtc3VibWVudScpO1xuICAgIC8vICAgICAkc3ViLnJlbW92ZUNsYXNzKCdzdWJtZW51ICcgKyBzdWJNZW51Q2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTmVzdCA9IE5lc3Q7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcbiAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiwvL29wdGlvbnMgaXMgYW4gb2JqZWN0IGZvciBlYXNpbHkgYWRkaW5nIGZlYXR1cmVzIGxhdGVyLlxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXG4gICAgICByZW1haW4gPSAtMSxcbiAgICAgIHN0YXJ0LFxuICAgICAgdGltZXI7XG5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuXG4gIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlbWFpbiA9IC0xO1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiA8PSAwID8gZHVyYXRpb24gOiByZW1haW47XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XG4gICAgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XG4gICAgICAgIF90aGlzLnJlc3RhcnQoKTsvL3JlcnVuIHRoZSB0aW1lci5cbiAgICAgIH1cbiAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICAgIH0sIHJlbWFpbik7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnN0YXJ0LnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG5cbiAgdGhpcy5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSB0cnVlO1xuICAgIC8vaWYoZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgdHJ1ZSk7XG4gICAgdmFyIGVuZCA9IERhdGUubm93KCk7XG4gICAgcmVtYWluID0gcmVtYWluIC0gKGVuZCAtIHN0YXJ0KTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVycGF1c2VkLnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG59XG5cbi8qKlxuICogUnVucyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gaW1hZ2VzIGFyZSBmdWxseSBsb2FkZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gaW1hZ2VzIC0gSW1hZ2UocykgdG8gY2hlY2sgaWYgbG9hZGVkLlxuICogQHBhcmFtIHtGdW5jfSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBpbWFnZSBpcyBmdWxseSBsb2FkZWQuXG4gKi9cbmZ1bmN0aW9uIG9uSW1hZ2VzTG9hZGVkKGltYWdlcywgY2FsbGJhY2spe1xuICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICB1bmxvYWRlZCA9IGltYWdlcy5sZW5ndGg7XG5cbiAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxuXG4gIGltYWdlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbXBsZXRlKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgdGhpcy5uYXR1cmFsV2lkdGggIT09ICd1bmRlZmluZWQnICYmIHRoaXMubmF0dXJhbFdpZHRoID4gMCkge1xuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkKHRoaXMpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBzaW5nbGVJbWFnZUxvYWRlZCgpIHtcbiAgICB1bmxvYWRlZC0tO1xuICAgIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbn1cblxuRm91bmRhdGlvbi5UaW1lciA9IFRpbWVyO1xuRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCA9IG9uSW1hZ2VzTG9hZGVkO1xuXG59KGpRdWVyeSk7XG4iLCIvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXG4vLyoqRG9uZSBieSBZb2hhaSBBcmFyYXQgKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4oZnVuY3Rpb24oJCkge1xuXG4gICQuc3BvdFN3aXBlID0ge1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgZW5hYmxlZDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIHByZXZlbnREZWZhdWx0OiBmYWxzZSxcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcbiAgICB0aW1lVGhyZXNob2xkOiAyMDBcbiAgfTtcblxuICB2YXIgICBzdGFydFBvc1gsXG4gICAgICAgIHN0YXJ0UG9zWSxcbiAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICBlbGFwc2VkVGltZSxcbiAgICAgICAgaXNNb3ZpbmcgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRvdWNoRW5kKCkge1xuICAgIC8vICBhbGVydCh0aGlzKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCk7XG4gICAgaXNNb3ZpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGUpIHtcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgaWYoaXNNb3ZpbmcpIHtcbiAgICAgIHZhciB4ID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICB2YXIgZHggPSBzdGFydFBvc1ggLSB4O1xuICAgICAgdmFyIGR5ID0gc3RhcnRQb3NZIC0geTtcbiAgICAgIHZhciBkaXI7XG4gICAgICBlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgaWYoTWF0aC5hYnMoZHgpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgICAgfVxuICAgICAgLy8gZWxzZSBpZihNYXRoLmFicyhkeSkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XG4gICAgICAvLyB9XG4gICAgICBpZihkaXIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBvblRvdWNoRW5kLmNhbGwodGhpcyk7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignc3dpcGUnLCBkaXIpLnRyaWdnZXIoYHN3aXBlJHtkaXJ9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGUpIHtcbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICBzdGFydFBvc1kgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICBpc01vdmluZyA9IHRydWU7XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUsIGZhbHNlKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgJiYgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZWFyZG93bigpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpO1xuICB9XG5cbiAgJC5ldmVudC5zcGVjaWFsLnN3aXBlID0geyBzZXR1cDogaW5pdCB9O1xuXG4gICQuZWFjaChbJ2xlZnQnLCAndXAnLCAnZG93bicsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XG4gICAgJC5ldmVudC5zcGVjaWFsW2Bzd2lwZSR7dGhpc31gXSA9IHsgc2V0dXA6IGZ1bmN0aW9uKCl7XG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XG4gICAgfSB9O1xuICB9KTtcbn0pKGpRdWVyeSk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWV0aG9kIGZvciBhZGRpbmcgcHN1ZWRvIGRyYWcgZXZlbnRzIHRvIGVsZW1lbnRzICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4hZnVuY3Rpb24oJCl7XG4gICQuZm4uYWRkVG91Y2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICQoZWwpLmJpbmQoJ3RvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJyxmdW5jdGlvbigpe1xuICAgICAgICAvL3dlIHBhc3MgdGhlIG9yaWdpbmFsIGV2ZW50IG9iamVjdCBiZWNhdXNlIHRoZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxuICAgICAgICBoYW5kbGVUb3VjaChldmVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3VjaCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgZmlyc3QgPSB0b3VjaGVzWzBdLFxuICAgICAgICAgIGV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgIHRvdWNobW92ZTogJ21vdXNlbW92ZScsXG4gICAgICAgICAgICB0b3VjaGVuZDogJ21vdXNldXAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0eXBlID0gZXZlbnRUeXBlc1tldmVudC50eXBlXSxcbiAgICAgICAgICBzaW11bGF0ZWRFdmVudFxuICAgICAgICA7XG5cbiAgICAgIGlmKCdNb3VzZUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5Nb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgJ2NhbmNlbGFibGUnOiB0cnVlLFxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcbiAgICAgICAgICAnc2NyZWVuWSc6IGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgJ2NsaWVudFgnOiBmaXJzdC5jbGllbnRYLFxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCBmaXJzdC5zY3JlZW5YLCBmaXJzdC5zY3JlZW5ZLCBmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMC8qbGVmdCovLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICB9O1xuICB9O1xufShqUXVlcnkpO1xuXG5cbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKkZyb20gdGhlIGpRdWVyeSBNb2JpbGUgTGlicmFyeSoqXG4vLyoqbmVlZCB0byByZWNyZWF0ZSBmdW5jdGlvbmFsaXR5Kipcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XG5cblx0dmFyICRkb2N1bWVudCA9ICQoIGRvY3VtZW50ICksXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcblx0XHR0b3VjaFN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIixcblx0XHR0b3VjaFN0b3BFdmVudCA9ICd0b3VjaGVuZCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiLFxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuXG5cdC8vIHNldHVwIG5ldyBldmVudCBzaG9ydGN1dHNcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xuXHRcdFwic3dpcGUgc3dpcGVsZWZ0IHN3aXBlcmlnaHRcIiApLnNwbGl0KCBcIiBcIiApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdHJldHVybiBmbiA/IHRoaXMuYmluZCggbmFtZSwgZm4gKSA6IHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHRcdH07XG5cblx0XHQvLyBqUXVlcnkgPCAxLjhcblx0XHRpZiAoICQuYXR0ckZuICkge1xuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0cmlnZ2VyQ3VzdG9tRXZlbnQoIG9iaiwgZXZlbnRUeXBlLCBldmVudCwgYnViYmxlICkge1xuXHRcdHZhciBvcmlnaW5hbFR5cGUgPSBldmVudC50eXBlO1xuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XG5cdFx0aWYgKCBidWJibGUgKSB7XG5cdFx0XHQkLmV2ZW50LnRyaWdnZXIoIGV2ZW50LCB1bmRlZmluZWQsIG9iaiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkLmV2ZW50LmRpc3BhdGNoLmNhbGwoIG9iaiwgZXZlbnQgKTtcblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcblx0fVxuXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXG5cblx0Ly8gQWxzbyBoYW5kbGVzIHN3aXBlbGVmdCwgc3dpcGVyaWdodFxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XG5cblx0XHQvLyBNb3JlIHRoYW4gdGhpcyBob3Jpem9udGFsIGRpc3BsYWNlbWVudCwgYW5kIHdlIHdpbGwgc3VwcHJlc3Mgc2Nyb2xsaW5nLlxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxuXG5cdFx0Ly8gTW9yZSB0aW1lIHRoYW4gdGhpcywgYW5kIGl0IGlzbid0IGEgc3dpcGUuXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXG5cblx0XHQvLyBTd2lwZSBob3Jpem9udGFsIGRpc3BsYWNlbWVudCBtdXN0IGJlIG1vcmUgdGhhbiB0aGlzLlxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHQvLyBTd2lwZSB2ZXJ0aWNhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBsZXNzIHRoYW4gdGhpcy5cblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdGdldExvY2F0aW9uOiBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxuXHRcdFx0XHR3aW5QYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRcdFx0eCA9IGV2ZW50LmNsaWVudFgsXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRpZiAoIGV2ZW50LnBhZ2VZID09PSAwICYmIE1hdGguZmxvb3IoIHkgKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VZICkgfHxcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBpT1M0IGNsaWVudFgvY2xpZW50WSBoYXZlIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBoYXZlIGJlZW5cblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcblx0XHRcdFx0eCA9IHggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IHkgLSB3aW5QYWdlWTtcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBTb21lIEFuZHJvaWQgYnJvd3NlcnMgaGF2ZSB0b3RhbGx5IGJvZ3VzIHZhbHVlcyBmb3IgY2xpZW50WC9ZXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxuXHRcdFx0XHQvLyBzaG91bGQgbmV2ZXIgYmUgc21hbGxlciB0aGFuIHBhZ2VYL3BhZ2VZIG1pbnVzIHBhZ2Ugc2Nyb2xsXG5cdFx0XHRcdHggPSBldmVudC5wYWdlWCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXG5cdFx0XHRcdFx0XHRvcmlnaW46ICQoIGV2ZW50LnRhcmdldCApXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XG5cdFx0XHRpZiAoIHN0b3AudGltZSAtIHN0YXJ0LnRpbWUgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZHVyYXRpb25UaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IHN0YXJ0LmNvb3Jkc1swXSA+IHN0b3AuY29vcmRzWyAwIF0gPyBcInN3aXBlbGVmdFwiIDogXCJzd2lwZXJpZ2h0XCI7XG5cblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBkaXJlY3Rpb24sJC5FdmVudCggZGlyZWN0aW9uLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9ICksIHRydWUgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHR9LFxuXG5cdFx0Ly8gVGhpcyBzZXJ2ZXMgYXMgYSBmbGFnIHRvIGVuc3VyZSB0aGF0IGF0IG1vc3Qgb25lIHN3aXBlIGV2ZW50IGV2ZW50IGlzXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxuXHRcdGV2ZW50SW5Qcm9ncmVzczogZmFsc2UsXG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLFxuXHRcdFx0XHR0aGlzT2JqZWN0ID0gdGhpcyxcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXG5cdFx0XHRcdGNvbnRleHQgPSB7fTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiLCBldmVudHMgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcblx0XHRcdGV2ZW50cy5zd2lwZSA9IGNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHRcdFx0Ly8gQmFpbCBpZiB3ZSdyZSBhbHJlYWR5IHdvcmtpbmcgb24gYSBzd2lwZSBldmVudFxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdHZhciBzdG9wLFxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxuXHRcdFx0XHRcdG9yaWdUYXJnZXQgPSBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0ZW1pdHRlZCA9IGZhbHNlO1xuXG5cdFx0XHRcdGNvbnRleHQubW92ZSA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRpZiAoICFzdGFydCB8fCBldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKCAhZW1pdHRlZCApIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaGFuZGxlU3dpcGUoIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcblx0XHRcdFx0XHRpZiAoIE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXG5cdFx0XHRcdFx0Lm9uZSggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0fTtcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHR9LFxuXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cywgY29udGV4dDtcblxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCBldmVudHMgKSB7XG5cdFx0XHRcdGNvbnRleHQgPSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGV2ZW50cy5sZW5ndGgtLTtcblx0XHRcdFx0aWYgKCBldmVudHMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRcdGlmICggY29udGV4dC5zdGFydCApIHtcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQubW92ZSApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0b3AgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHQkLmVhY2goe1xuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXG5cdFx0c3dpcGVyaWdodDogXCJzd2lwZS5yaWdodFwiXG5cdH0sIGZ1bmN0aW9uKCBldmVudCwgc291cmNlRXZlbnQgKSB7XG5cblx0XHQkLmV2ZW50LnNwZWNpYWxbIGV2ZW50IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoIGpRdWVyeSwgdGhpcyApO1xuKi9cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYCBpbiB3aW5kb3cpIHtcbiAgICAgIHJldHVybiB3aW5kb3dbYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KCkpO1xuXG5jb25zdCB0cmlnZ2VycyA9IChlbCwgdHlwZSkgPT4ge1xuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XG4gICAgJChgIyR7aWR9YClbIHR5cGUgPT09ICdjbG9zZScgPyAndHJpZ2dlcicgOiAndHJpZ2dlckhhbmRsZXInXShgJHt0eXBlfS56Zi50cmlnZ2VyYCwgW2VsXSk7XG4gIH0pO1xufTtcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtb3Blbl0gd2lsbCByZXZlYWwgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1vcGVuXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4vLyBJZiB1c2VkIHdpdGhvdXQgYSB2YWx1ZSBvbiBbZGF0YS1jbG9zZV0sIHRoZSBldmVudCB3aWxsIGJ1YmJsZSwgYWxsb3dpbmcgaXQgdG8gY2xvc2UgYSBwYXJlbnQgY29tcG9uZW50LlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2VdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ2Nsb3NlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGVdJywgZnVuY3Rpb24oKSB7XG4gIHRyaWdnZXJzKCQodGhpcyksICd0b2dnbGUnKTtcbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NhYmxlXSB3aWxsIHJlc3BvbmQgdG8gY2xvc2UuemYudHJpZ2dlciBldmVudHMuXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgbGV0IGFuaW1hdGlvbiA9ICQodGhpcykuZGF0YSgnY2xvc2FibGUnKTtcblxuICBpZihhbmltYXRpb24gIT09ICcnKXtcbiAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KCQodGhpcyksIGFuaW1hdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgfVxufSk7XG5cbiQoZG9jdW1lbnQpLm9uKCdmb2N1cy56Zi50cmlnZ2VyIGJsdXIuemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGUtZm9jdXNdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlLWZvY3VzJyk7XG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XG59KTtcblxuLyoqXG4qIEZpcmVzIG9uY2UgYWZ0ZXIgYWxsIG90aGVyIHNjcmlwdHMgaGF2ZSBsb2FkZWRcbiogQGZ1bmN0aW9uXG4qIEBwcml2YXRlXG4qL1xuJCh3aW5kb3cpLm9uKCdsb2FkJywgKCkgPT4ge1xuICBjaGVja0xpc3RlbmVycygpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xuICBldmVudHNMaXN0ZW5lcigpO1xuICByZXNpemVMaXN0ZW5lcigpO1xuICBzY3JvbGxMaXN0ZW5lcigpO1xuICBjbG9zZW1lTGlzdGVuZXIoKTtcbn1cblxuLy8qKioqKioqKiBvbmx5IGZpcmVzIHRoaXMgZnVuY3Rpb24gb25jZSBvbiBsb2FkLCBpZiB0aGVyZSdzIHNvbWV0aGluZyB0byB3YXRjaCAqKioqKioqKlxuZnVuY3Rpb24gY2xvc2VtZUxpc3RlbmVyKHBsdWdpbk5hbWUpIHtcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxuICAgICAgcGx1Z05hbWVzID0gWydkcm9wZG93bicsICd0b29sdGlwJywgJ3JldmVhbCddO1xuXG4gIGlmKHBsdWdpbk5hbWUpe1xuICAgIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMucHVzaChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5jb25jYXQocGx1Z2luTmFtZSk7XG4gICAgfWVsc2V7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICB9XG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xuICAgIGxldCBsaXN0ZW5lcnMgPSBwbHVnTmFtZXMubWFwKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gYGNsb3NlbWUuemYuJHtuYW1lfWA7XG4gICAgfSkuam9pbignICcpO1xuXG4gICAgJCh3aW5kb3cpLm9mZihsaXN0ZW5lcnMpLm9uKGxpc3RlbmVycywgZnVuY3Rpb24oZSwgcGx1Z2luSWQpe1xuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XG4gICAgICBsZXQgcGx1Z2lucyA9ICQoYFtkYXRhLSR7cGx1Z2lufV1gKS5ub3QoYFtkYXRhLXlldGktYm94PVwiJHtwbHVnaW5JZH1cIl1gKTtcblxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCBfdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtcmVzaXplXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuemYudHJpZ2dlcicpXG4gICAgLm9uKCdyZXNpemUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwicmVzaXplXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgcmVzaXplIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZih0aW1lcil7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBzY3JvbGwgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJzY3JvbGxcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudHNMaXN0ZW5lcigpIHtcbiAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaXplXSwgW2RhdGEtc2Nyb2xsXSwgW2RhdGEtbXV0YXRlXScpO1xuXG4gIC8vZWxlbWVudCBjYWxsYmFja1xuICB2YXIgbGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiA9IGZ1bmN0aW9uKG11dGF0aW9uUmVjb3Jkc0xpc3QpIHtcbiAgICB2YXIgJHRhcmdldCA9ICQobXV0YXRpb25SZWNvcmRzTGlzdFswXS50YXJnZXQpO1xuICAgIC8vdHJpZ2dlciB0aGUgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGVsZW1lbnQgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICBzd2l0Y2ggKCR0YXJnZXQuYXR0cihcImRhdGEtZXZlbnRzXCIpKSB7XG5cbiAgICAgIGNhc2UgXCJyZXNpemVcIiA6XG4gICAgICAkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXRdKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwic2Nyb2xsXCIgOlxuICAgICAgJHRhcmdldC50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LCB3aW5kb3cucGFnZVlPZmZzZXRdKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIFwibXV0YXRlXCIgOlxuICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0ZScsICR0YXJnZXQpO1xuICAgICAgLy8gJHRhcmdldC50cmlnZ2VySGFuZGxlcignbXV0YXRlLnpmLnRyaWdnZXInKTtcbiAgICAgIC8vXG4gICAgICAvLyAvL21ha2Ugc3VyZSB3ZSBkb24ndCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcCBmcm9tIHNsb3BweSBjb2RlaW5nXG4gICAgICAvLyBpZiAoJHRhcmdldC5pbmRleCgnW2RhdGEtbXV0YXRlXScpID09ICQoXCJbZGF0YS1tdXRhdGVdXCIpLmxlbmd0aC0xKSB7XG4gICAgICAvLyAgIGRvbU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgICAgIC8vIH1cbiAgICAgIC8vIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0IDpcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vbm90aGluZ1xuICAgIH1cbiAgfVxuXG4gIGlmKG5vZGVzLmxlbmd0aCl7XG4gICAgLy9mb3IgZWFjaCBlbGVtZW50IHRoYXQgbmVlZHMgdG8gbGlzdGVuIGZvciByZXNpemluZywgc2Nyb2xsaW5nLCAob3IgY29taW5nIHNvb24gbXV0YXRpb24pIGFkZCBhIHNpbmdsZSBvYnNlcnZlclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDw9IG5vZGVzLmxlbmd0aC0xOyBpKyspIHtcbiAgICAgIGxldCBlbGVtZW50T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uKTtcbiAgICAgIGVsZW1lbnRPYnNlcnZlci5vYnNlcnZlKG5vZGVzW2ldLCB7IGF0dHJpYnV0ZXM6IHRydWUsIGNoaWxkTGlzdDogZmFsc2UsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOmZhbHNlLCBhdHRyaWJ1dGVGaWx0ZXI6W1wiZGF0YS1ldmVudHNcIl19KTtcbiAgICB9XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFtQSF1cbi8vIEZvdW5kYXRpb24uQ2hlY2tXYXRjaGVycyA9IGNoZWNrV2F0Y2hlcnM7XG5Gb3VuZGF0aW9uLklIZWFyWW91ID0gY2hlY2tMaXN0ZW5lcnM7XG4vLyBGb3VuZGF0aW9uLklTZWVZb3UgPSBzY3JvbGxMaXN0ZW5lcjtcbi8vIEZvdW5kYXRpb24uSUZlZWxZb3UgPSBjbG9zZW1lTGlzdGVuZXI7XG5cbn0oalF1ZXJ5KTtcblxuLy8gZnVuY3Rpb24gZG9tTXV0YXRpb25PYnNlcnZlcihkZWJvdW5jZSkge1xuLy8gICAvLyAhISEgVGhpcyBpcyBjb21pbmcgc29vbiBhbmQgbmVlZHMgbW9yZSB3b3JrOyBub3QgYWN0aXZlICAhISEgLy9cbi8vICAgdmFyIHRpbWVyLFxuLy8gICBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLW11dGF0ZV0nKTtcbi8vICAgLy9cbi8vICAgaWYgKG5vZGVzLmxlbmd0aCkge1xuLy8gICAgIC8vIHZhciBNdXRhdGlvbk9ic2VydmVyID0gKGZ1bmN0aW9uICgpIHtcbi8vICAgICAvLyAgIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuLy8gICAgIC8vICAgZm9yICh2YXIgaT0wOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbi8vICAgICAvLyAgICAgaWYgKHByZWZpeGVzW2ldICsgJ011dGF0aW9uT2JzZXJ2ZXInIGluIHdpbmRvdykge1xuLy8gICAgIC8vICAgICAgIHJldHVybiB3aW5kb3dbcHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlciddO1xuLy8gICAgIC8vICAgICB9XG4vLyAgICAgLy8gICB9XG4vLyAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4vLyAgICAgLy8gfSgpKTtcbi8vXG4vL1xuLy8gICAgIC8vZm9yIHRoZSBib2R5LCB3ZSBuZWVkIHRvIGxpc3RlbiBmb3IgYWxsIGNoYW5nZXMgZWZmZWN0aW5nIHRoZSBzdHlsZSBhbmQgY2xhc3MgYXR0cmlidXRlc1xuLy8gICAgIHZhciBib2R5T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihib2R5TXV0YXRpb24pO1xuLy8gICAgIGJvZHlPYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTp0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6W1wic3R5bGVcIiwgXCJjbGFzc1wiXX0pO1xuLy9cbi8vXG4vLyAgICAgLy9ib2R5IGNhbGxiYWNrXG4vLyAgICAgZnVuY3Rpb24gYm9keU11dGF0aW9uKG11dGF0ZSkge1xuLy8gICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIG11dGF0aW9uIGV2ZW50XG4vLyAgICAgICBpZiAodGltZXIpIHsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuLy9cbi8vICAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbi8vICAgICAgICAgYm9keU9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbi8vICAgICAgICAgJCgnW2RhdGEtbXV0YXRlXScpLmF0dHIoJ2RhdGEtZXZlbnRzJyxcIm11dGF0ZVwiKTtcbi8vICAgICAgIH0sIGRlYm91bmNlIHx8IDE1MCk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWJpZGUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFiaWRlXG4gKi9cblxuY2xhc3MgQWJpZGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBBYmlkZS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBYmlkZSNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgQWJpZGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0FiaWRlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEFiaWRlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBBYmlkZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpO1xuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBBYmlkZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy5hYmlkZScpXG4gICAgICAub24oJ3Jlc2V0LnpmLmFiaWRlJywgKCkgPT4ge1xuICAgICAgICB0aGlzLnJlc2V0Rm9ybSgpO1xuICAgICAgfSlcbiAgICAgIC5vbignc3VibWl0LnpmLmFiaWRlJywgKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy52YWxpZGF0ZUZvcm0oKTtcbiAgICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy52YWxpZGF0ZU9uID09PSAnZmllbGRDaGFuZ2UnKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignY2hhbmdlLnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdjaGFuZ2UuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMubGl2ZVZhbGlkYXRlKSB7XG4gICAgICB0aGlzLiRpbnB1dHNcbiAgICAgICAgLm9mZignaW5wdXQuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2lucHV0LnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgQWJpZGUgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciBvciBub3QgYSBmb3JtIGVsZW1lbnQgaGFzIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYW5kIGlmIGl0J3MgY2hlY2tlZCBvciBub3RcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgcmVxdWlyZWRDaGVjaygkZWwpIHtcbiAgICBpZiAoISRlbC5hdHRyKCdyZXF1aXJlZCcpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHZhciBpc0dvb2QgPSB0cnVlO1xuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBpc0dvb2QgPSAkZWxbMF0uY2hlY2tlZDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhciBvcHQgPSAkZWwuZmluZCgnb3B0aW9uOnNlbGVjdGVkJyk7XG4gICAgICAgIGlmICghb3B0Lmxlbmd0aCB8fCAhb3B0LnZhbCgpKSBpc0dvb2QgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmKCEkZWwudmFsKCkgfHwgISRlbC52YWwoKS5sZW5ndGgpIGlzR29vZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBpc0dvb2Q7XG4gIH1cblxuICAvKipcbiAgICogQmFzZWQgb24gJGVsLCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aCBzZWxlY3RvciBpbiB0aGlzIG9yZGVyOlxuICAgKiAxLiBUaGUgZWxlbWVudCdzIGRpcmVjdCBzaWJsaW5nKCdzKS5cbiAgICogMy4gVGhlIGVsZW1lbnQncyBwYXJlbnQncyBjaGlsZHJlbi5cbiAgICpcbiAgICogVGhpcyBhbGxvd3MgZm9yIG11bHRpcGxlIGZvcm0gZXJyb3JzIHBlciBpbnB1dCwgdGhvdWdoIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBmb3JtIGVycm9ycyB3aWxsIGJlIHNob3duLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgcmVmZXJlbmNlIHRvIGZpbmQgdGhlIGZvcm0gZXJyb3Igc2VsZWN0b3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBvYmplY3Qgd2l0aCB0aGUgc2VsZWN0b3IuXG4gICAqL1xuICBmaW5kRm9ybUVycm9yKCRlbCkge1xuICAgIHZhciAkZXJyb3IgPSAkZWwuc2libGluZ3ModGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcblxuICAgIGlmICghJGVycm9yLmxlbmd0aCkge1xuICAgICAgJGVycm9yID0gJGVsLnBhcmVudCgpLmZpbmQodGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGVycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGlzIG9yZGVyOlxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcbiAgICogMy4gVGhlIGAuY2xvc2VzdCgpYCA8bGFiZWw+XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgZmluZExhYmVsKCRlbCkge1xuICAgIHZhciBpZCA9ICRlbFswXS5pZDtcbiAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJGVsLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICRsYWJlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNldCBvZiBsYWJlbHMgYXNzb2NpYXRlZCB3aXRoIGEgc2V0IG9mIHJhZGlvIGVscyBpbiB0aGlzIG9yZGVyXG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kUmFkaW9MYWJlbHMoJGVscykge1xuICAgIHZhciBsYWJlbHMgPSAkZWxzLm1hcCgoaSwgZWwpID0+IHtcbiAgICAgIHZhciBpZCA9IGVsLmlkO1xuICAgICAgdmFyICRsYWJlbCA9IHRoaXMuJGVsZW1lbnQuZmluZChgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcblxuICAgICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAgICRsYWJlbCA9ICQoZWwpLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGxhYmVsWzBdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuICQobGFiZWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyB0byB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSBjbGFzcyB0b1xuICAgKi9cbiAgYWRkRXJyb3JDbGFzc2VzKCRlbCkge1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5hdHRyKCdkYXRhLWludmFsaWQnLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIENTUyBlcnJvciBjbGFzc2VzIGV0YyBmcm9tIGFuIGVudGlyZSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqXG4gICAqL1xuXG4gIHJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKGdyb3VwTmFtZSkge1xuICAgIHZhciAkZWxzID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciAkbGFiZWxzID0gdGhpcy5maW5kUmFkaW9MYWJlbHMoJGVscyk7XG4gICAgdmFyICRmb3JtRXJyb3JzID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbHMpO1xuXG4gICAgaWYgKCRsYWJlbHMubGVuZ3RoKSB7XG4gICAgICAkbGFiZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9ycy5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3JzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgZnJvbSB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tXG4gICAqL1xuICByZW1vdmVFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgLy8gcmFkaW9zIG5lZWQgdG8gY2xlYXIgYWxsIG9mIHRoZSBlbHNcbiAgICBpZigkZWxbMF0udHlwZSA9PSAncmFkaW8nKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcygkZWwuYXR0cignbmFtZScpKTtcbiAgICB9XG5cbiAgICB2YXIgJGxhYmVsID0gdGhpcy5maW5kTGFiZWwoJGVsKTtcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xuXG4gICAgaWYgKCRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICRsYWJlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3IucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSB0byBmaW5kIGlucHV0cyBhbmQgcHJvY2VlZHMgdG8gdmFsaWRhdGUgdGhlbSBpbiB3YXlzIHNwZWNpZmljIHRvIHRoZWlyIHR5cGVcbiAgICogQGZpcmVzIEFiaWRlI2ludmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI3ZhbGlkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGFuIEhUTUwgaW5wdXRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGdvb2RUb0dvIC0gSWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC5cbiAgICovXG4gIHZhbGlkYXRlSW5wdXQoJGVsKSB7XG4gICAgdmFyIGNsZWFyUmVxdWlyZSA9IHRoaXMucmVxdWlyZWRDaGVjaygkZWwpLFxuICAgICAgICB2YWxpZGF0ZWQgPSBmYWxzZSxcbiAgICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdHJ1ZSxcbiAgICAgICAgdmFsaWRhdG9yID0gJGVsLmF0dHIoJ2RhdGEtdmFsaWRhdG9yJyksXG4gICAgICAgIGVxdWFsVG8gPSB0cnVlO1xuXG4gICAgLy8gZG9uJ3QgdmFsaWRhdGUgaWdub3JlZCBpbnB1dHMgb3IgaGlkZGVuIGlucHV0c1xuICAgIGlmICgkZWwuaXMoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKSB8fCAkZWwuaXMoJ1t0eXBlPVwiaGlkZGVuXCJdJykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHN3aXRjaCAoJGVsWzBdLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgdmFsaWRhdGVkID0gdGhpcy52YWxpZGF0ZVJhZGlvKCRlbC5hdHRyKCduYW1lJykpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICB2YWxpZGF0ZWQgPSBjbGVhclJlcXVpcmU7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XG4gICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICB2YWxpZGF0ZWQgPSBjbGVhclJlcXVpcmU7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlVGV4dCgkZWwpO1xuICAgIH1cblxuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIGN1c3RvbVZhbGlkYXRvciA9IHRoaXMubWF0Y2hWYWxpZGF0aW9uKCRlbCwgdmFsaWRhdG9yLCAkZWwuYXR0cigncmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgaWYgKCRlbC5hdHRyKCdkYXRhLWVxdWFsdG8nKSkge1xuICAgICAgZXF1YWxUbyA9IHRoaXMub3B0aW9ucy52YWxpZGF0b3JzLmVxdWFsVG8oJGVsKTtcbiAgICB9XG5cblxuICAgIHZhciBnb29kVG9HbyA9IFtjbGVhclJlcXVpcmUsIHZhbGlkYXRlZCwgY3VzdG9tVmFsaWRhdG9yLCBlcXVhbFRvXS5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG4gICAgdmFyIG1lc3NhZ2UgPSAoZ29vZFRvR28gPyAndmFsaWQnIDogJ2ludmFsaWQnKSArICcuemYuYWJpZGUnO1xuXG4gICAgdGhpc1tnb29kVG9HbyA/ICdyZW1vdmVFcnJvckNsYXNzZXMnIDogJ2FkZEVycm9yQ2xhc3NlcyddKCRlbCk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBpbnB1dCBpcyBkb25lIGNoZWNraW5nIGZvciB2YWxpZGF0aW9uLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgdmFsaWQuemYuYWJpZGVgIG9yIGBpbnZhbGlkLnpmLmFiaWRlYFxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIERPTSBlbGVtZW50IG9mIHRoZSBpbnB1dC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjdmFsaWRcbiAgICAgKiBAZXZlbnQgQWJpZGUjaW52YWxpZFxuICAgICAqL1xuICAgICRlbC50cmlnZ2VyKG1lc3NhZ2UsIFskZWxdKTtcblxuICAgIHJldHVybiBnb29kVG9HbztcbiAgfVxuXG4gIC8qKlxuICAgKiBHb2VzIHRocm91Z2ggYSBmb3JtIGFuZCBpZiB0aGVyZSBhcmUgYW55IGludmFsaWQgaW5wdXRzLCBpdCB3aWxsIGRpc3BsYXkgdGhlIGZvcm0gZXJyb3IgZWxlbWVudFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gbm9FcnJvciAtIHRydWUgaWYgbm8gZXJyb3JzIHdlcmUgZGV0ZWN0ZWQuLi5cbiAgICogQGZpcmVzIEFiaWRlI2Zvcm12YWxpZFxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybWludmFsaWRcbiAgICovXG4gIHZhbGlkYXRlRm9ybSgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGlucHV0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgYWNjLnB1c2goX3RoaXMudmFsaWRhdGVJbnB1dCgkKHRoaXMpKSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbm9FcnJvciA9IGFjYy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpLmNzcygnZGlzcGxheScsIChub0Vycm9yID8gJ25vbmUnIDogJ2Jsb2NrJykpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBpcyBmaW5pc2hlZCB2YWxpZGF0aW5nLiBFdmVudCB0cmlnZ2VyIGlzIGVpdGhlciBgZm9ybXZhbGlkLnpmLmFiaWRlYCBvciBgZm9ybWludmFsaWQuemYuYWJpZGVgLlxuICAgICAqIFRyaWdnZXIgaW5jbHVkZXMgdGhlIGVsZW1lbnQgb2YgdGhlIGZvcm0uXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm12YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtaW52YWxpZFxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigobm9FcnJvciA/ICdmb3JtdmFsaWQnIDogJ2Zvcm1pbnZhbGlkJykgKyAnLnpmLmFiaWRlJywgW3RoaXMuJGVsZW1lbnRdKTtcblxuICAgIHJldHVybiBub0Vycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciBvciBhIG5vdCBhIHRleHQgaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gdGhlIHBhdHRlcm4gc3BlY2lmaWVkIGluIHRoZSBhdHRyaWJ1dGUuIElmIG5vIG1hdGNoaW5nIHBhdHRlcm4gaXMgZm91bmQsIHJldHVybnMgdHJ1ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gdmFsaWRhdGUsIHNob3VsZCBiZSBhIHRleHQgaW5wdXQgSFRNTCBlbGVtZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXR0ZXJuIC0gc3RyaW5nIHZhbHVlIG9mIG9uZSBvZiB0aGUgUmVnRXggcGF0dGVybnMgaW4gQWJpZGUub3B0aW9ucy5wYXR0ZXJuc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IHRoZSBpbnB1dCB2YWx1ZSBtYXRjaGVzIHRoZSBwYXR0ZXJuIHNwZWNpZmllZFxuICAgKi9cbiAgdmFsaWRhdGVUZXh0KCRlbCwgcGF0dGVybikge1xuICAgIC8vIEEgcGF0dGVybiBjYW4gYmUgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIG9yIGl0IHdpbGwgYmUgaW5mZXJlZCBmcm9tIHRoZSBpbnB1dCdzIFwicGF0dGVyblwiIGF0dHJpYnV0ZSwgb3IgaXQncyBcInR5cGVcIiBhdHRyaWJ1dGVcbiAgICBwYXR0ZXJuID0gKHBhdHRlcm4gfHwgJGVsLmF0dHIoJ3BhdHRlcm4nKSB8fCAkZWwuYXR0cigndHlwZScpKTtcbiAgICB2YXIgaW5wdXRUZXh0ID0gJGVsLnZhbCgpO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlO1xuXG4gICAgaWYgKGlucHV0VGV4dC5sZW5ndGgpIHtcbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudCBpcyBpbiBBYmlkZSdzIGxpc3Qgb2YgcGF0dGVybnMsIHRoZW4gdGVzdCB0aGF0IHJlZ2V4cFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5wYXR0ZXJucy5oYXNPd25Qcm9wZXJ0eShwYXR0ZXJuKSkge1xuICAgICAgICB2YWxpZCA9IHRoaXMub3B0aW9ucy5wYXR0ZXJuc1twYXR0ZXJuXS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgcGF0dGVybiBuYW1lIGlzbid0IGFsc28gdGhlIHR5cGUgYXR0cmlidXRlIG9mIHRoZSBmaWVsZCwgdGhlbiB0ZXN0IGl0IGFzIGEgcmVnZXhwXG4gICAgICBlbHNlIGlmIChwYXR0ZXJuICE9PSAkZWwuYXR0cigndHlwZScpKSB7XG4gICAgICAgIHZhbGlkID0gbmV3IFJlZ0V4cChwYXR0ZXJuKS50ZXN0KGlucHV0VGV4dCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsaWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbiBlbXB0eSBmaWVsZCBpcyB2YWxpZCBpZiBpdCdzIG5vdCByZXF1aXJlZFxuICAgIGVsc2UgaWYgKCEkZWwucHJvcCgncmVxdWlyZWQnKSkge1xuICAgICAgdmFsaWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZDtcbiAgIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgcmFkaW8gaW5wdXQgaXMgdmFsaWQgYmFzZWQgb24gd2hldGhlciBvciBub3QgaXQgaXMgcmVxdWlyZWQgYW5kIHNlbGVjdGVkLiBBbHRob3VnaCB0aGUgZnVuY3Rpb24gdGFyZ2V0cyBhIHNpbmdsZSBgPGlucHV0PmAsIGl0IHZhbGlkYXRlcyBieSBjaGVja2luZyB0aGUgYHJlcXVpcmVkYCBhbmQgYGNoZWNrZWRgIHByb3BlcnRpZXMgb2YgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gaXRzIGdyb3VwLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZ3JvdXBOYW1lIC0gQSBzdHJpbmcgdGhhdCBzcGVjaWZpZXMgdGhlIG5hbWUgb2YgYSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdCBsZWFzdCBvbmUgcmFkaW8gaW5wdXQgaGFzIGJlZW4gc2VsZWN0ZWQgKGlmIGl0J3MgcmVxdWlyZWQpXG4gICAqL1xuICB2YWxpZGF0ZVJhZGlvKGdyb3VwTmFtZSkge1xuICAgIC8vIElmIGF0IGxlYXN0IG9uZSByYWRpbyBpbiB0aGUgZ3JvdXAgaGFzIHRoZSBgcmVxdWlyZWRgIGF0dHJpYnV0ZSwgdGhlIGdyb3VwIGlzIGNvbnNpZGVyZWQgcmVxdWlyZWRcbiAgICAvLyBQZXIgVzNDIHNwZWMsIGFsbCByYWRpbyBidXR0b25zIGluIGEgZ3JvdXAgc2hvdWxkIGhhdmUgYHJlcXVpcmVkYCwgYnV0IHdlJ3JlIGJlaW5nIG5pY2VcbiAgICB2YXIgJGdyb3VwID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciB2YWxpZCA9IGZhbHNlLCByZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSByZXF1aXJlZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIHJlcXVpcmVkXG4gICAgJGdyb3VwLmVhY2goKGksIGUpID0+IHtcbiAgICAgIGlmICgkKGUpLmF0dHIoJ3JlcXVpcmVkJykpIHtcbiAgICAgICAgcmVxdWlyZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmKCFyZXF1aXJlZCkgdmFsaWQ9dHJ1ZTtcblxuICAgIGlmICghdmFsaWQpIHtcbiAgICAgIC8vIEZvciB0aGUgZ3JvdXAgdG8gYmUgdmFsaWQsIGF0IGxlYXN0IG9uZSByYWRpbyBuZWVkcyB0byBiZSBjaGVja2VkXG4gICAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgICBpZiAoJChlKS5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gdmFsaWQ7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyBpZiBhIHNlbGVjdGVkIGlucHV0IHBhc3NlcyBhIGN1c3RvbSB2YWxpZGF0aW9uIGZ1bmN0aW9uLiBNdWx0aXBsZSB2YWxpZGF0aW9ucyBjYW4gYmUgdXNlZCwgaWYgcGFzc2VkIHRvIHRoZSBlbGVtZW50IHdpdGggYGRhdGEtdmFsaWRhdG9yPVwiZm9vIGJhciBiYXpcImAgaW4gYSBzcGFjZSBzZXBhcmF0ZWQgbGlzdGVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IGlucHV0IGVsZW1lbnQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2YWxpZGF0b3JzIC0gYSBzdHJpbmcgb2YgZnVuY3Rpb24gbmFtZXMgbWF0Y2hpbmcgZnVuY3Rpb25zIGluIHRoZSBBYmlkZS5vcHRpb25zLnZhbGlkYXRvcnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHJlcXVpcmVkIC0gc2VsZiBleHBsYW5hdG9yeT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiB2YWxpZGF0aW9ucyBwYXNzZWQuXG4gICAqL1xuICBtYXRjaFZhbGlkYXRpb24oJGVsLCB2YWxpZGF0b3JzLCByZXF1aXJlZCkge1xuICAgIHJlcXVpcmVkID0gcmVxdWlyZWQgPyB0cnVlIDogZmFsc2U7XG5cbiAgICB2YXIgY2xlYXIgPSB2YWxpZGF0b3JzLnNwbGl0KCcgJykubWFwKCh2KSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5vcHRpb25zLnZhbGlkYXRvcnNbdl0oJGVsLCByZXF1aXJlZCwgJGVsLnBhcmVudCgpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gY2xlYXIuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyBmb3JtIGlucHV0cyBhbmQgc3R5bGVzXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtcmVzZXRcbiAgICovXG4gIHJlc2V0Rm9ybSgpIHtcbiAgICB2YXIgJGZvcm0gPSB0aGlzLiRlbGVtZW50LFxuICAgICAgICBvcHRzID0gdGhpcy5vcHRpb25zO1xuXG4gICAgJChgLiR7b3B0cy5sYWJlbEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmxhYmVsRXJyb3JDbGFzcyk7XG4gICAgJChgLiR7b3B0cy5pbnB1dEVycm9yQ2xhc3N9YCwgJGZvcm0pLm5vdCgnc21hbGwnKS5yZW1vdmVDbGFzcyhvcHRzLmlucHV0RXJyb3JDbGFzcyk7XG4gICAgJChgJHtvcHRzLmZvcm1FcnJvclNlbGVjdG9yfS4ke29wdHMuZm9ybUVycm9yQ2xhc3N9YCkucmVtb3ZlQ2xhc3Mob3B0cy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgJGZvcm0uZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAkKCc6aW5wdXQnLCAkZm9ybSkubm90KCc6YnV0dG9uLCA6c3VibWl0LCA6cmVzZXQsIDpoaWRkZW4sIDpyYWRpbywgOmNoZWNrYm94LCBbZGF0YS1hYmlkZS1pZ25vcmVdJykudmFsKCcnKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAkKCc6aW5wdXQ6cmFkaW8nLCAkZm9ybSkubm90KCdbZGF0YS1hYmlkZS1pZ25vcmVdJykucHJvcCgnY2hlY2tlZCcsZmFsc2UpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpjaGVja2JveCcsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgZm9ybSBoYXMgYmVlbiByZXNldC5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXJlc2V0XG4gICAgICovXG4gICAgJGZvcm0udHJpZ2dlcignZm9ybXJlc2V0LnpmLmFiaWRlJywgWyRmb3JtXSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgQWJpZGUuXG4gICAqIFJlbW92ZXMgZXJyb3Igc3R5bGVzIGFuZCBjbGFzc2VzIGZyb20gZWxlbWVudHMsIHdpdGhvdXQgcmVzZXR0aW5nIHRoZWlyIHZhbHVlcy5cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmZpbmQoJ1tkYXRhLWFiaWRlLWVycm9yXScpXG4gICAgICAgIC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXG4gICAgdGhpcy4kaW5wdXRzXG4gICAgICAub2ZmKCcuYWJpZGUnKVxuICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLnJlbW92ZUVycm9yQ2xhc3NlcygkKHRoaXMpKTtcbiAgICAgIH0pO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkFiaWRlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGRlZmF1bHQgZXZlbnQgdG8gdmFsaWRhdGUgaW5wdXRzLiBDaGVja2JveGVzIGFuZCByYWRpb3MgdmFsaWRhdGUgaW1tZWRpYXRlbHkuXG4gICAqIFJlbW92ZSBvciBjaGFuZ2UgdGhpcyB2YWx1ZSBmb3IgbWFudWFsIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2ZpZWxkQ2hhbmdlJ1xuICAgKi9cbiAgdmFsaWRhdGVPbjogJ2ZpZWxkQ2hhbmdlJyxcblxuICAvKipcbiAgICogQ2xhc3MgdG8gYmUgYXBwbGllZCB0byBpbnB1dCBsYWJlbHMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLWludmFsaWQtbGFiZWwnXG4gICAqL1xuICBsYWJlbEVycm9yQ2xhc3M6ICdpcy1pbnZhbGlkLWxhYmVsJyxcblxuICAvKipcbiAgICogQ2xhc3MgdG8gYmUgYXBwbGllZCB0byBpbnB1dHMgb24gZmFpbGVkIHZhbGlkYXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2lzLWludmFsaWQtaW5wdXQnXG4gICAqL1xuICBpbnB1dEVycm9yQ2xhc3M6ICdpcy1pbnZhbGlkLWlucHV0JyxcblxuICAvKipcbiAgICogQ2xhc3Mgc2VsZWN0b3IgdG8gdXNlIHRvIHRhcmdldCBGb3JtIEVycm9ycyBmb3Igc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcuZm9ybS1lcnJvcidcbiAgICovXG4gIGZvcm1FcnJvclNlbGVjdG9yOiAnLmZvcm0tZXJyb3InLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhZGRlZCB0byBGb3JtIEVycm9ycyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtdmlzaWJsZSdcbiAgICovXG4gIGZvcm1FcnJvckNsYXNzOiAnaXMtdmlzaWJsZScsXG5cbiAgLyoqXG4gICAqIFNldCB0byB0cnVlIHRvIHZhbGlkYXRlIHRleHQgaW5wdXRzIG9uIGFueSB2YWx1ZSBjaGFuZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGxpdmVWYWxpZGF0ZTogZmFsc2UsXG5cbiAgcGF0dGVybnM6IHtcbiAgICBhbHBoYSA6IC9eW2EtekEtWl0rJC8sXG4gICAgYWxwaGFfbnVtZXJpYyA6IC9eW2EtekEtWjAtOV0rJC8sXG4gICAgaW50ZWdlciA6IC9eWy0rXT9cXGQrJC8sXG4gICAgbnVtYmVyIDogL15bLStdP1xcZCooPzpbXFwuXFwsXVxcZCspPyQvLFxuXG4gICAgLy8gYW1leCwgdmlzYSwgZGluZXJzXG4gICAgY2FyZCA6IC9eKD86NFswLTldezEyfSg/OlswLTldezN9KT98NVsxLTVdWzAtOV17MTR9fDYoPzowMTF8NVswLTldWzAtOV0pWzAtOV17MTJ9fDNbNDddWzAtOV17MTN9fDMoPzowWzAtNV18WzY4XVswLTldKVswLTldezExfXwoPzoyMTMxfDE4MDB8MzVcXGR7M30pXFxkezExfSkkLyxcbiAgICBjdnYgOiAvXihbMC05XSl7Myw0fSQvLFxuXG4gICAgLy8gaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2Uvc3RhdGVzLW9mLXRoZS10eXBlLWF0dHJpYnV0ZS5odG1sI3ZhbGlkLWUtbWFpbC1hZGRyZXNzXG4gICAgZW1haWwgOiAvXlthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSskLyxcblxuICAgIHVybCA6IC9eKGh0dHBzP3xmdHB8ZmlsZXxzc2gpOlxcL1xcLygoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKChcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSkpfCgoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSlcXC4pKygoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2EtekEtWl18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKihbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLj8pKDpcXGQqKT8pKFxcLygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KT8oXFw/KCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKXxbXFx1RTAwMC1cXHVGOEZGXXxcXC98XFw/KSopPyhcXCMoKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFxcL3xcXD8pKik/JC8sXG4gICAgLy8gYWJjLmRlXG4gICAgZG9tYWluIDogL14oW2EtekEtWjAtOV0oW2EtekEtWjAtOVxcLV17MCw2MX1bYS16QS1aMC05XSk/XFwuKStbYS16QS1aXXsyLDh9JC8sXG5cbiAgICBkYXRldGltZSA6IC9eKFswLTJdWzAtOV17M30pXFwtKFswLTFdWzAtOV0pXFwtKFswLTNdWzAtOV0pVChbMC01XVswLTldKVxcOihbMC01XVswLTldKVxcOihbMC01XVswLTldKShafChbXFwtXFwrXShbMC0xXVswLTldKVxcOjAwKSkkLyxcbiAgICAvLyBZWVlZLU1NLUREXG4gICAgZGF0ZSA6IC8oPzoxOXwyMClbMC05XXsyfS0oPzooPzowWzEtOV18MVswLTJdKS0oPzowWzEtOV18MVswLTldfDJbMC05XSl8KD86KD8hMDIpKD86MFsxLTldfDFbMC0yXSktKD86MzApKXwoPzooPzowWzEzNTc4XXwxWzAyXSktMzEpKSQvLFxuICAgIC8vIEhIOk1NOlNTXG4gICAgdGltZSA6IC9eKDBbMC05XXwxWzAtOV18MlswLTNdKSg6WzAtNV1bMC05XSl7Mn0kLyxcbiAgICBkYXRlSVNPIDogL15cXGR7NH1bXFwvXFwtXVxcZHsxLDJ9W1xcL1xcLV1cXGR7MSwyfSQvLFxuICAgIC8vIE1NL0REL1lZWVlcbiAgICBtb250aF9kYXlfeWVhciA6IC9eKDBbMS05XXwxWzAxMl0pWy0gXFwvLl0oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXVxcZHs0fSQvLFxuICAgIC8vIEREL01NL1lZWVlcbiAgICBkYXlfbW9udGhfeWVhciA6IC9eKDBbMS05XXxbMTJdWzAtOV18M1swMV0pWy0gXFwvLl0oMFsxLTldfDFbMDEyXSlbLSBcXC8uXVxcZHs0fSQvLFxuXG4gICAgLy8gI0ZGRiBvciAjRkZGRkZGXG4gICAgY29sb3IgOiAvXiM/KFthLWZBLUYwLTldezZ9fFthLWZBLUYwLTldezN9KSQvXG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHZhbGlkYXRpb24gZnVuY3Rpb25zIHRvIGJlIHVzZWQuIGBlcXVhbFRvYCBiZWluZyB0aGUgb25seSBkZWZhdWx0IGluY2x1ZGVkIGZ1bmN0aW9uLlxuICAgKiBGdW5jdGlvbnMgc2hvdWxkIHJldHVybiBvbmx5IGEgYm9vbGVhbiBpZiB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90LiBGdW5jdGlvbnMgYXJlIGdpdmVuIHRoZSBmb2xsb3dpbmcgYXJndW1lbnRzOlxuICAgKiBlbCA6IFRoZSBqUXVlcnkgZWxlbWVudCB0byB2YWxpZGF0ZS5cbiAgICogcmVxdWlyZWQgOiBCb29sZWFuIHZhbHVlIG9mIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYmUgcHJlc2VudCBvciBub3QuXG4gICAqIHBhcmVudCA6IFRoZSBkaXJlY3QgcGFyZW50IG9mIHRoZSBpbnB1dC5cbiAgICogQG9wdGlvblxuICAgKi9cbiAgdmFsaWRhdG9yczoge1xuICAgIGVxdWFsVG86IGZ1bmN0aW9uIChlbCwgcmVxdWlyZWQsIHBhcmVudCkge1xuICAgICAgcmV0dXJuICQoYCMke2VsLmF0dHIoJ2RhdGEtZXF1YWx0bycpfWApLnZhbCgpID09PSBlbC52YWwoKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFiaWRlLCAnQWJpZGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICovXG5cbmNsYXNzIEFjY29yZGlvbiB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbi5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBhIHBsYWluIG9iamVjdCB3aXRoIHNldHRpbmdzIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIEFjY29yZGlvbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uJywge1xuICAgICAgJ0VOVEVSJzogJ3RvZ2dsZScsXG4gICAgICAnU1BBQ0UnOiAndG9nZ2xlJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBhY2NvcmRpb24gYnkgYW5pbWF0aW5nIHRoZSBwcmVzZXQgYWN0aXZlIHBhbmUocykuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ3JvbGUnLCAndGFibGlzdCcpO1xuICAgIHRoaXMuJHRhYnMgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCdsaSwgW2RhdGEtYWNjb3JkaW9uLWl0ZW1dJyk7XG5cbiAgICB0aGlzLiR0YWJzLmVhY2goZnVuY3Rpb24oaWR4LCBlbCkge1xuICAgICAgdmFyICRlbCA9ICQoZWwpLFxuICAgICAgICAgICRjb250ZW50ID0gJGVsLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKSxcbiAgICAgICAgICBpZCA9ICRjb250ZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjY29yZGlvbicpLFxuICAgICAgICAgIGxpbmtJZCA9IGVsLmlkIHx8IGAke2lkfS1sYWJlbGA7XG5cbiAgICAgICRlbC5maW5kKCdhOmZpcnN0JykuYXR0cih7XG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogaWQsXG4gICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICdpZCc6IGxpbmtJZCxcbiAgICAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgICRjb250ZW50LmF0dHIoeydyb2xlJzogJ3RhYnBhbmVsJywgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZCwgJ2FyaWEtaGlkZGVuJzogdHJ1ZSwgJ2lkJzogaWR9KTtcbiAgICB9KTtcbiAgICB2YXIgJGluaXRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY3RpdmUnKS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgaWYoJGluaXRBY3RpdmUubGVuZ3RoKXtcbiAgICAgIHRoaXMuZG93bigkaW5pdEFjdGl2ZSwgdHJ1ZSk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgYWNjb3JkaW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kdGFicy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKTtcbiAgICAgIHZhciAkdGFiQ29udGVudCA9ICRlbGVtLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICAgIGlmICgkdGFiQ29udGVudC5sZW5ndGgpIHtcbiAgICAgICAgJGVsZW0uY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbiBrZXlkb3duLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgICAub24oJ2NsaWNrLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMudG9nZ2xlKCR0YWJDb250ZW50KTtcbiAgICAgICAgfSkub24oJ2tleWRvd24uemYuYWNjb3JkaW9uJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbicsIHtcbiAgICAgICAgICAgIHRvZ2dsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIF90aGlzLnRvZ2dsZSgkdGFiQ29udGVudCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciAkYSA9ICRlbGVtLm5leHQoKS5maW5kKCdhJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyICRhID0gJGVsZW0ucHJldigpLmZpbmQoJ2EnKS5mb2N1cygpO1xuICAgICAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQpIHtcbiAgICAgICAgICAgICAgICAkYS50cmlnZ2VyKCdjbGljay56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgc2VsZWN0ZWQgY29udGVudCBwYW5lJ3Mgb3Blbi9jbG9zZSBzdGF0ZS5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBqUXVlcnkgb2JqZWN0IG9mIHRoZSBwYW5lIHRvIHRvZ2dsZSAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KSB7XG4gICAgaWYoJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZG93bigkdGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgdGhlIGFjY29yZGlvbiB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHBhbmUgdG8gb3BlbiAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZpcnN0VGltZSAtIGZsYWcgdG8gZGV0ZXJtaW5lIGlmIHJlZmxvdyBzaG91bGQgaGFwcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rvd25cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkb3duKCR0YXJnZXQsIGZpcnN0VGltZSkge1xuICAgICR0YXJnZXRcbiAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsIGZhbHNlKVxuICAgICAgLnBhcmVudCgnW2RhdGEtdGFiLWNvbnRlbnRdJylcbiAgICAgIC5hZGRCYWNrKClcbiAgICAgIC5wYXJlbnQoKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCAmJiAhZmlyc3RUaW1lKSB7XG4gICAgICB2YXIgJGN1cnJlbnRBY3RpdmUgPSB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgICAgaWYgKCRjdXJyZW50QWN0aXZlLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnVwKCRjdXJyZW50QWN0aXZlLm5vdCgkdGFyZ2V0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJHRhcmdldC5zbGlkZURvd24odGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICgpID0+IHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgdGFiIGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAqIEBldmVudCBBY2NvcmRpb24jZG93blxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uJywgWyR0YXJnZXRdKTtcbiAgICB9KTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICAnYXJpYS1leHBhbmRlZCc6IHRydWUsXG4gICAgICAnYXJpYS1zZWxlY3RlZCc6IHRydWVcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHRhYiBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBBY2NvcmRpb24gdGFiIHRvIGNsb3NlIChgLmFjY29yZGlvbi1jb250ZW50YCkuXG4gICAqIEBmaXJlcyBBY2NvcmRpb24jdXBcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyICRhdW50cyA9ICR0YXJnZXQucGFyZW50KCkuc2libGluZ3MoKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYoKCF0aGlzLm9wdGlvbnMuYWxsb3dBbGxDbG9zZWQgJiYgISRhdW50cy5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHx8ICEkdGFyZ2V0LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1hY3RpdmUnKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb24jdXBcbiAgICAgICAgICovXG4gICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3VwLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvLyB9KTtcblxuICAgICR0YXJnZXQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKVxuICAgICAgICAgICAucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgJChgIyR7JHRhcmdldC5hdHRyKCdhcmlhLWxhYmVsbGVkYnknKX1gKS5hdHRyKHtcbiAgICAgJ2FyaWEtZXhwYW5kZWQnOiBmYWxzZSxcbiAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBmYWxzZVxuICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI2Rlc3Ryb3llZFxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS10YWItY29udGVudF0nKS5zdG9wKHRydWUpLnNsaWRlVXAoMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignLnpmLmFjY29yZGlvbicpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbkFjY29yZGlvbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYW4gYWNjb3JkaW9uIHBhbmUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBzbGlkZVNwZWVkOiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgYWNjb3JkaW9uIHRvIGhhdmUgbXVsdGlwbGUgb3BlbiBwYW5lcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbXVsdGlFeHBhbmQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBjbG9zZSBhbGwgcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFsbG93QWxsQ2xvc2VkOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbiwgJ0FjY29yZGlvbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWNjb3JkaW9uTWVudSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWNjb3JkaW9uTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIEFjY29yZGlvbk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBBY2NvcmRpb25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnYWNjb3JkaW9uJyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBY2NvcmRpb25NZW51Jyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignQWNjb3JkaW9uTWVudScsIHtcbiAgICAgICdFTlRFUic6ICd0b2dnbGUnLFxuICAgICAgJ1NQQUNFJzogJ3RvZ2dsZScsXG4gICAgICAnQVJST1dfUklHSFQnOiAnb3BlbicsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdjbG9zZScsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlQWxsJ1xuICAgIH0pO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgYWNjb3JkaW9uIG1lbnUgYnkgaGlkaW5nIGFsbCBuZXN0ZWQgbWVudXMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykubm90KCcuaXMtYWN0aXZlJykuc2xpZGVVcCgwKTsvLy5maW5kKCdhJykuY3NzKCdwYWRkaW5nLWxlZnQnLCAnMXJlbScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAncm9sZSc6ICdtZW51JyxcbiAgICAgICdhcmlhLW11bHRpc2VsZWN0YWJsZSc6IHRoaXMub3B0aW9ucy5tdWx0aU9wZW5cbiAgICB9KTtcblxuICAgIHRoaXMuJG1lbnVMaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpO1xuICAgIHRoaXMuJG1lbnVMaW5rcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbGlua0lkID0gdGhpcy5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2MtbWVudS1saW5rJyksXG4gICAgICAgICAgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRzdWIgPSAkZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSxcbiAgICAgICAgICBzdWJJZCA9ICRzdWJbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUnKSxcbiAgICAgICAgICBpc0FjdGl2ZSA9ICRzdWIuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgJGVsZW0uYXR0cih7XG4gICAgICAgICdhcmlhLWNvbnRyb2xzJzogc3ViSWQsXG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ21lbnVpdGVtJyxcbiAgICAgICAgJ2lkJzogbGlua0lkXG4gICAgICB9KTtcbiAgICAgICRzdWIuYXR0cih7XG4gICAgICAgICdhcmlhLWxhYmVsbGVkYnknOiBsaW5rSWQsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ3JvbGUnOiAnbWVudScsXG4gICAgICAgICdpZCc6IHN1YklkXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgaW5pdFBhbmVzID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJyk7XG4gICAgaWYoaW5pdFBhbmVzLmxlbmd0aCl7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgaW5pdFBhbmVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgX3RoaXMuZG93bigkKHRoaXMpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIG1lbnUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkc3VibWVudSA9ICQodGhpcykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG5cbiAgICAgIGlmICgkc3VibWVudS5sZW5ndGgpIHtcbiAgICAgICAgJCh0aGlzKS5jaGlsZHJlbignYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpLm9uKCdjbGljay56Zi5hY2NvcmRpb25NZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgIF90aGlzLnRvZ2dsZSgkc3VibWVudSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbm1lbnUnLCBmdW5jdGlvbihlKXtcbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQsXG4gICAgICAgICAgJHRhcmdldCA9ICRlbGVtZW50LmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1heCgwLCBpLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKS5maW5kKCdhJykuZmlyc3QoKTtcblxuICAgICAgICAgIGlmICgkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XTp2aXNpYmxlJykubGVuZ3RoKSB7IC8vIGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudC5maW5kKCdsaTpmaXJzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmZpcnN0LWNoaWxkJykpIHsgLy8gaXMgZmlyc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHByZXZFbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBpZiBwcmV2aW91cyBlbGVtZW50IGhhcyBvcGVuIHN1YiBtZW51XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkcHJldkVsZW1lbnQucGFyZW50cygnbGknKS5maW5kKCdsaTpsYXN0LWNoaWxkJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgkKHRoaXMpLmlzKCc6bGFzdC1jaGlsZCcpKSB7IC8vIGlzIGxhc3QgZWxlbWVudCBvZiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLm5leHQoJ2xpJykuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICAgIF90aGlzLmRvd24oJHRhcmdldCk7XG4gICAgICAgICAgICAkdGFyZ2V0LmZpbmQoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0Lmxlbmd0aCAmJiAhJHRhcmdldC5pcygnOmhpZGRlbicpKSB7IC8vIGNsb3NlIGFjdGl2ZSBzdWIgb2YgdGhpcyBpdGVtXG4gICAgICAgICAgICBfdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHsgLy8gY2xvc2UgY3VycmVudGx5IG9wZW4gc3ViXG4gICAgICAgICAgICBfdGhpcy51cCgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50cygnbGknKS5maXJzdCgpLmZpbmQoJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIF90aGlzLnRvZ2dsZSgkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuaGlkZUFsbCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTsvLy5hdHRyKCd0YWJpbmRleCcsIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcGFuZXMgb2YgdGhlIG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgaGlkZUFsbCgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVVcCh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb3Blbi9jbG9zZSBzdGF0ZSBvZiBhIHN1Ym1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIHRoZSBzdWJtZW51IHRvIHRvZ2dsZVxuICAgKi9cbiAgdG9nZ2xlKCR0YXJnZXQpe1xuICAgIGlmKCEkdGFyZ2V0LmlzKCc6YW5pbWF0ZWQnKSkge1xuICAgICAgaWYgKCEkdGFyZ2V0LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgdGhpcy51cCgkdGFyZ2V0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmRvd24oJHRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBzdWItbWVudSBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBvcGVuLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNkb3duXG4gICAqL1xuICBkb3duKCR0YXJnZXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYoIXRoaXMub3B0aW9ucy5tdWx0aU9wZW4pIHtcbiAgICAgIHRoaXMudXAodGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJykubm90KCR0YXJnZXQucGFyZW50c1VudGlsKHRoaXMuJGVsZW1lbnQpLmFkZCgkdGFyZ2V0KSkpO1xuICAgIH1cblxuICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmF0dHIoeydhcmlhLWhpZGRlbic6IGZhbHNlfSlcbiAgICAgIC5wYXJlbnQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IHRydWV9KTtcblxuICAgICAgLy9Gb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkdGFyZ2V0LnNsaWRlRG93bihfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGRvbmUgb3BlbmluZy5cbiAgICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSNkb3duXG4gICAgICAgICAgICovXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignZG93bi56Zi5hY2NvcmRpb25NZW51JywgWyR0YXJnZXRdKTtcbiAgICAgICAgfSk7XG4gICAgICAvL30pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuIEFsbCBzdWItbWVudXMgaW5zaWRlIHRoZSB0YXJnZXQgd2lsbCBiZSBjbG9zZWQgYXMgd2VsbC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBTdWItbWVudSB0byBjbG9zZS5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjdXBcbiAgICovXG4gIHVwKCR0YXJnZXQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpe1xuICAgICAgJHRhcmdldC5zbGlkZVVwKF90aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIGNvbGxhcHNpbmcgdXAuXG4gICAgICAgICAqIEBldmVudCBBY2NvcmRpb25NZW51I3VwXG4gICAgICAgICAqL1xuICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cC56Zi5hY2NvcmRpb25NZW51JywgWyR0YXJnZXRdKTtcbiAgICAgIH0pO1xuICAgIC8vfSk7XG5cbiAgICB2YXIgJG1lbnVzID0gJHRhcmdldC5maW5kKCdbZGF0YS1zdWJtZW51XScpLnNsaWRlVXAoMCkuYWRkQmFjaygpLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSk7XG5cbiAgICAkbWVudXMucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhY2NvcmRpb24gbWVudS5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZGVzdHJveWVkXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZURvd24oMCkuY3NzKCdkaXNwbGF5JywgJycpO1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLm9mZignY2xpY2suemYuYWNjb3JkaW9uTWVudScpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5BY2NvcmRpb25NZW51LmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gYW5pbWF0ZSB0aGUgb3BlbmluZyBvZiBhIHN1Ym1lbnUgaW4gbXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjUwXG4gICAqL1xuICBzbGlkZVNwZWVkOiAyNTAsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byBoYXZlIG11bHRpcGxlIG9wZW4gcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgbXVsdGlPcGVuOiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWNjb3JkaW9uTWVudSwgJ0FjY29yZGlvbk1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyaWxsZG93biBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJpbGxkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5uZXN0XG4gKi9cblxuY2xhc3MgRHJpbGxkb3duIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkcmlsbGRvd24gbWVudS5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJpbGxkb3duLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJpbGxkb3duJyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcmlsbGRvd24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcmlsbGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICAgICdUQUInOiAnZG93bicsXG4gICAgICAnU0hJRlRfVEFCJzogJ3VwJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBkcmlsbGRvd24gYnkgY3JlYXRpbmcgalF1ZXJ5IGNvbGxlY3Rpb25zIG9mIGVsZW1lbnRzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJpbGxkb3duLXN1Ym1lbnUtcGFyZW50JykuY2hpbGRyZW4oJ2EnKTtcbiAgICB0aGlzLiRzdWJtZW51cyA9IHRoaXMuJHN1Ym1lbnVBbmNob3JzLnBhcmVudCgnbGknKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpJykubm90KCcuanMtZHJpbGxkb3duLWJhY2snKS5hdHRyKCdyb2xlJywgJ21lbnVpdGVtJykuZmluZCgnYScpO1xuXG4gICAgdGhpcy5fcHJlcGFyZU1lbnUoKTtcblxuICAgIHRoaXMuX2tleWJvYXJkRXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogcHJlcGFyZXMgZHJpbGxkb3duIG1lbnUgYnkgc2V0dGluZyBhdHRyaWJ1dGVzIHRvIGxpbmtzIGFuZCBlbGVtZW50c1xuICAgKiBzZXRzIGEgbWluIGhlaWdodCB0byBwcmV2ZW50IGNvbnRlbnQganVtcGluZ1xuICAgKiB3cmFwcyB0aGUgZWxlbWVudCBpZiBub3QgYWxyZWFkeSB3cmFwcGVkXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX3ByZXBhcmVNZW51KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgLy8gaWYoIXRoaXMub3B0aW9ucy5ob2xkT3Blbil7XG4gICAgLy8gICB0aGlzLl9tZW51TGlua0V2ZW50cygpO1xuICAgIC8vIH1cbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgdmFyICRzdWIgPSAkbGluay5wYXJlbnQoKTtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMucGFyZW50TGluayl7XG4gICAgICAgICRsaW5rLmNsb25lKCkucHJlcGVuZFRvKCRzdWIuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpLndyYXAoJzxsaSBjbGFzcz1cImlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0gaXMtc3VibWVudS1pdGVtIGlzLWRyaWxsZG93bi1zdWJtZW51LWl0ZW1cIiByb2xlPVwibWVudS1pdGVtXCI+PC9saT4nKTtcbiAgICAgIH1cbiAgICAgICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicsICRsaW5rLmF0dHIoJ2hyZWYnKSkucmVtb3ZlQXR0cignaHJlZicpLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gICAgICAkbGluay5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICAgICAndGFiaW5kZXgnOiAwLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoJGxpbmspO1xuICAgIH0pO1xuICAgIHRoaXMuJHN1Ym1lbnVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbWVudSA9ICQodGhpcyksXG4gICAgICAgICAgJGJhY2sgPSAkbWVudS5maW5kKCcuanMtZHJpbGxkb3duLWJhY2snKTtcbiAgICAgIGlmKCEkYmFjay5sZW5ndGgpe1xuICAgICAgICAkbWVudS5wcmVwZW5kKF90aGlzLm9wdGlvbnMuYmFja0J1dHRvbik7XG4gICAgICB9XG4gICAgICBfdGhpcy5fYmFjaygkbWVudSk7XG4gICAgfSk7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bicpKXtcbiAgICAgIHRoaXMuJHdyYXBwZXIgPSAkKHRoaXMub3B0aW9ucy53cmFwcGVyKS5hZGRDbGFzcygnaXMtZHJpbGxkb3duJyk7XG4gICAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC53cmFwKHRoaXMuJHdyYXBwZXIpLnBhcmVudCgpLmNzcyh0aGlzLl9nZXRNYXhEaW1zKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIGVsZW1lbnRzIGluIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgbWVudSBpdGVtIHRvIGFkZCBoYW5kbGVycyB0by5cbiAgICovXG4gIF9ldmVudHMoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZigkKGUudGFyZ2V0KS5wYXJlbnRzVW50aWwoJ3VsJywgJ2xpJykuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZihlLnRhcmdldCAhPT0gZS5jdXJyZW50VGFyZ2V0LmZpcnN0RWxlbWVudENoaWxkKXtcbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gfVxuICAgICAgX3RoaXMuX3Nob3coJGVsZW0ucGFyZW50KCdsaScpKTtcblxuICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spe1xuICAgICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAgICRib2R5Lm9mZignLnpmLmRyaWxsZG93bicpLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8ICQuY29udGFpbnMoX3RoaXMuJGVsZW1lbnRbMF0sIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBrZXlkb3duIGV2ZW50IGxpc3RlbmVyIHRvIGBsaWAncyBpbiB0aGUgbWVudS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9rZXlib2FyZEV2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kbWVudUl0ZW1zLmFkZCh0aGlzLiRlbGVtZW50LmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjayA+IGEnKSkub24oJ2tleWRvd24uemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICAgJGVsZW1lbnRzID0gJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKS5jaGlsZHJlbignYScpLFxuICAgICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShNYXRoLm1pbihpKzEsICRlbGVtZW50cy5sZW5ndGgtMSkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdEcmlsbGRvd24nLCB7XG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbWVudC5wYXJlbnQoJ2xpJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykpO1xuICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKS5jaGlsZHJlbignYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHByZXZFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRuZXh0RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2JhY2soKTtcbiAgICAgICAgICAvL190aGlzLiRtZW51SXRlbXMuZmlyc3QoKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICghJGVsZW1lbnQuaXMoX3RoaXMuJG1lbnVJdGVtcykpIHsgLy8gbm90IG1lbnUgaXRlbSBtZWFucyBiYWNrIGJ1dHRvblxuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpLmNoaWxkcmVuKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7ICAgICAgICAgICAgXG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5pcyhfdGhpcy4kc3VibWVudUFuY2hvcnMpKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbWVudC5wYXJlbnQoJ2xpJykpO1xuICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW1lbnQpLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykuZmluZCgndWwgbGkgYScpLmZpbHRlcihfdGhpcy4kbWVudUl0ZW1zKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7IC8vIGVuZCBrZXlib2FyZEFjY2Vzc1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgb3BlbiBlbGVtZW50cywgYW5kIHJldHVybnMgdG8gcm9vdCBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNjbG9zZWRcbiAgICovXG4gIF9oaWRlQWxsKCkge1xuICAgIHZhciAkZWxlbSA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWRyaWxsZG93bi1zdWJtZW51LmlzLWFjdGl2ZScpLmFkZENsYXNzKCdpcy1jbG9zaW5nJyk7XG4gICAgJGVsZW0ub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbSksIGZ1bmN0aW9uKGUpe1xuICAgICAgJGVsZW0ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1jbG9zaW5nJyk7XG4gICAgfSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBtZW51IGlzIGZ1bGx5IGNsb3NlZC5cbiAgICAgICAgICogQGV2ZW50IERyaWxsZG93biNjbG9zZWRcbiAgICAgICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYuZHJpbGxkb3duJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciBmb3IgZWFjaCBgYmFja2AgYnV0dG9uLCBhbmQgY2xvc2VzIG9wZW4gbWVudXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2JhY2tcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtIC0gdGhlIGN1cnJlbnQgc3ViLW1lbnUgdG8gYWRkIGBiYWNrYCBldmVudC5cbiAgICovXG4gIF9iYWNrKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAkZWxlbS5vZmYoJ2NsaWNrLnpmLmRyaWxsZG93bicpO1xuICAgICRlbGVtLmNoaWxkcmVuKCcuanMtZHJpbGxkb3duLWJhY2snKVxuICAgICAgLm9uKCdjbGljay56Zi5kcmlsbGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ21vdXNldXAgb24gYmFjaycpO1xuICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwYXJlbnQgc3VibWVudSwgY2FsbCBzaG93XG4gICAgICAgIGxldCBwYXJlbnRTdWJNZW51ID0gJGVsZW0ucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJyk7XG4gICAgICAgIGlmIChwYXJlbnRTdWJNZW51Lmxlbmd0aCkgeyBcbiAgICAgICAgICBfdGhpcy5fc2hvdyhwYXJlbnRTdWJNZW51KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciB0byBtZW51IGl0ZW1zIHcvbyBzdWJtZW51cyB0byBjbG9zZSBvcGVuIG1lbnVzIG9uIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tZW51TGlua0V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJG1lbnVJdGVtcy5ub3QoJy5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKVxuICAgICAgICAub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgICAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIC8vIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgc3VibWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jb3BlblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIG9wZW4sIGkuZS4gdGhlIGBsaWAgdGFnLlxuICAgKi9cbiAgX3Nob3coJGVsZW0pIHtcbiAgICAkZWxlbS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgdHJ1ZSk7XG4gICAgJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc3VibWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNoaWRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGhpZGUsIGkuZS4gdGhlIGB1bGAgdGFnLlxuICAgKi9cbiAgX2hpZGUoJGVsZW0pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICRlbGVtLnBhcmVudCgnbGknKS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuICAgICRlbGVtLmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSkuYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKVxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICAgICAgICAgJGVsZW0uYmx1cigpO1xuICAgICAgICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgY2xvc2VkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jaGlkZVxuICAgICAqL1xuICAgICRlbGVtLnRyaWdnZXIoJ2hpZGUuemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgdGhyb3VnaCB0aGUgbmVzdGVkIG1lbnVzIHRvIGNhbGN1bGF0ZSB0aGUgbWluLWhlaWdodCwgYW5kIG1heC13aWR0aCBmb3IgdGhlIG1lbnUuXG4gICAqIFByZXZlbnRzIGNvbnRlbnQganVtcGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0TWF4RGltcygpIHtcbiAgICB2YXIgYmlnZ2VzdCA9IDBcbiAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICB0aGlzLiRzdWJtZW51cy5hZGQodGhpcy4kZWxlbWVudCkuZWFjaCgoaSwgZWxlbSkgPT4ge1xuICAgICAgdmFyIGhlaWdodCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgaWYgKGhlaWdodCA+IGJpZ2dlc3QpIGJpZ2dlc3QgPSBoZWlnaHQ7XG4gICAgfSk7XG5cbiAgICByZXN1bHRbJ21pbi1oZWlnaHQnXSA9IGAke2JpZ2dlc3R9cHhgO1xuICAgIHJlc3VsdFsnbWF4LXdpZHRoJ10gPSBgJHt0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRofXB4YDtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIERyaWxsZG93biBNZW51XG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9oaWRlQWxsKCk7XG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2RyaWxsZG93bicpO1xuICAgIHRoaXMuJGVsZW1lbnQudW53cmFwKClcbiAgICAgICAgICAgICAgICAgLmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaywgLmlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0nKS5yZW1vdmUoKVxuICAgICAgICAgICAgICAgICAuZW5kKCkuZmluZCgnLmlzLWFjdGl2ZSwgLmlzLWNsb3NpbmcsIC5pcy1kcmlsbGRvd24tc3VibWVudScpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZyBpcy1kcmlsbGRvd24tc3VibWVudScpXG4gICAgICAgICAgICAgICAgIC5lbmQoKS5maW5kKCdbZGF0YS1zdWJtZW51XScpLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuIHRhYmluZGV4IHJvbGUnKTtcbiAgICB0aGlzLiRzdWJtZW51QW5jaG9ycy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS5vZmYoJy56Zi5kcmlsbGRvd24nKTtcbiAgICB9KTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGxpbmsgPSAkKHRoaXMpO1xuICAgICAgJGxpbmsucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgICAgIGlmKCRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKXtcbiAgICAgICAgJGxpbmsuYXR0cignaHJlZicsICRsaW5rLmRhdGEoJ3NhdmVkSHJlZicpKS5yZW1vdmVEYXRhKCdzYXZlZEhyZWYnKTtcbiAgICAgIH1lbHNleyByZXR1cm47IH1cbiAgICB9KTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cbkRyaWxsZG93bi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1hcmt1cCB1c2VkIGZvciBKUyBnZW5lcmF0ZWQgYmFjayBidXR0b24uIFByZXBlbmRlZCB0byBzdWJtZW51IGxpc3RzIGFuZCBkZWxldGVkIG9uIGBkZXN0cm95YCBtZXRob2QsICdqcy1kcmlsbGRvd24tYmFjaycgY2xhc3MgcmVxdWlyZWQuIFJlbW92ZSB0aGUgYmFja3NsYXNoIChgXFxgKSBpZiBjb3B5IGFuZCBwYXN0aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICc8XFxsaT48XFxhPkJhY2s8XFwvYT48XFwvbGk+J1xuICAgKi9cbiAgYmFja0J1dHRvbjogJzxsaSBjbGFzcz1cImpzLWRyaWxsZG93bi1iYWNrXCI+PGEgdGFiaW5kZXg9XCIwXCI+QmFjazwvYT48L2xpPicsXG4gIC8qKlxuICAgKiBNYXJrdXAgdXNlZCB0byB3cmFwIGRyaWxsZG93biBtZW51LiBVc2UgYSBjbGFzcyBuYW1lIGZvciBpbmRlcGVuZGVudCBzdHlsaW5nOyB0aGUgSlMgYXBwbGllZCBjbGFzczogYGlzLWRyaWxsZG93bmAgaXMgcmVxdWlyZWQuIFJlbW92ZSB0aGUgYmFja3NsYXNoIChgXFxgKSBpZiBjb3B5IGFuZCBwYXN0aW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICc8XFxkaXYgY2xhc3M9XCJpcy1kcmlsbGRvd25cIj48XFwvZGl2PidcbiAgICovXG4gIHdyYXBwZXI6ICc8ZGl2PjwvZGl2PicsXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBwYXJlbnQgbGluayB0byB0aGUgc3VibWVudS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgcGFyZW50TGluazogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgbWVudSB0byByZXR1cm4gdG8gcm9vdCBsaXN0IG9uIGJvZHkgY2xpY2suXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGNsb3NlT25DbGljazogZmFsc2VcbiAgLy8gaG9sZE9wZW46IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oRHJpbGxkb3duLCAnRHJpbGxkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93biBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZHJvcGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgRHJvcGRvd24ge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyb3Bkb3duLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duLlxuICAgKiAgICAgICAgT2JqZWN0IHNob3VsZCBiZSBvZiB0aGUgZHJvcGRvd24gcGFuZWwsIHJhdGhlciB0aGFuIGl0cyBhbmNob3IuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd24uZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0Ryb3Bkb3duJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ3RhYl9mb3J3YXJkJyxcbiAgICAgICdTSElGVF9UQUInOiAndGFiX2JhY2t3YXJkJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgc2V0dGluZy9jaGVja2luZyBvcHRpb25zIGFuZCBhdHRyaWJ1dGVzLCBhZGRpbmcgaGVscGVyIHZhcmlhYmxlcywgYW5kIHNhdmluZyB0aGUgYW5jaG9yLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKSA6ICQoYFtkYXRhLW9wZW49XCIkeyRpZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6ICRpZCxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2VcblxuICAgIH0pO1xuXG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6ICRpZCxcbiAgICAgICdhcmlhLWxhYmVsbGVkYnknOiB0aGlzLiRhbmNob3JbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZGQtYW5jaG9yJylcbiAgICB9KTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGN1cnJlbnQgb3JpZW50YXRpb24gb2YgZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IHBvc2l0aW9uIC0gc3RyaW5nIHZhbHVlIG9mIGEgcG9zaXRpb24gY2xhc3MuXG4gICAqL1xuICBnZXRQb3NpdGlvbkNsYXNzKCkge1xuICAgIHZhciB2ZXJ0aWNhbFBvc2l0aW9uID0gdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyh0b3B8bGVmdHxyaWdodHxib3R0b20pL2cpO1xuICAgICAgICB2ZXJ0aWNhbFBvc2l0aW9uID0gdmVydGljYWxQb3NpdGlvbiA/IHZlcnRpY2FsUG9zaXRpb25bMF0gOiAnJztcbiAgICB2YXIgaG9yaXpvbnRhbFBvc2l0aW9uID0gL2Zsb2F0LShcXFMrKS8uZXhlYyh0aGlzLiRhbmNob3JbMF0uY2xhc3NOYW1lKTtcbiAgICAgICAgaG9yaXpvbnRhbFBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uWzFdIDogJyc7XG4gICAgdmFyIHBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uICsgJyAnICsgdmVydGljYWxQb3NpdGlvbiA6IHZlcnRpY2FsUG9zaXRpb247XG5cbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyB0aGUgZHJvcGRvd24gcGFuZXMgb3JpZW50YXRpb24gYnkgYWRkaW5nL3JlbW92aW5nIHBvc2l0aW9uaW5nIGNsYXNzZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbiBjbGFzcyB0byByZW1vdmUuXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIHBhbmUsIGNoZWNrcyBmb3IgY29sbGlzaW9ucy5cbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICBpZih0aGlzLiRhbmNob3IuYXR0cignYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXG4gICAgICAgICRlbGVEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGFuY2hvciksXG4gICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XG5cblxuXG4gICAgaWYoKCRlbGVEaW1zLndpZHRoID49ICRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpIHx8ICghdGhpcy5jb3VudGVyICYmICFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMuJGVsZW1lbnQpKSl7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMuJGVsZW1lbnQsIHRoaXMuJGFuY2hvciwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgICAnd2lkdGgnOiAkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCBwb3NpdGlvbiwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCBmYWxzZSwgdHJ1ZSkgJiYgdGhpcy5jb3VudGVyKXtcbiAgICAgIHRoaXMuX3JlcG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIGVsZW1lbnQgdXRpbGl6aW5nIHRoZSB0cmlnZ2VycyB1dGlsaXR5IGxpYnJhcnkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9zZXRQb3NpdGlvbi5iaW5kKHRoaXMpXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXIpe1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignbW91c2VlbnRlci56Zi5kcm9wZG93biBtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJylcbiAgICAgIC5vbignbW91c2VlbnRlci56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZigkKCdib2R5W2RhdGEtd2hhdGlucHV0PVwibW91c2VcIl0nKS5pcygnKicpKSB7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5kYXRhKCdob3ZlcicsIHRydWUpO1xuICAgICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgIH0pO1xuICAgICAgaWYodGhpcy5vcHRpb25zLmhvdmVyUGFuZSl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duIG1vdXNlbGVhdmUuemYuZHJvcGRvd24nKVxuICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3duJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuJGFuY2hvci5hZGQodGhpcy4kZWxlbWVudCkub24oJ2tleWRvd24uemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKSB7XG5cbiAgICAgIHZhciAkdGFyZ2V0ID0gJCh0aGlzKSxcbiAgICAgICAgdmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKF90aGlzLiRlbGVtZW50KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duJywge1xuICAgICAgICB0YWJfZm9yd2FyZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgtMSkpKSB7IC8vIGxlZnQgbW9kYWwgZG93bndhcmRzLCBzZXR0aW5nIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLnRyYXBGb2N1cykgeyAvLyBpZiBmb2N1cyBzaGFsbCBiZSB0cmFwcGVkXG4gICAgICAgICAgICAgIHZpc2libGVGb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpZiBmb2N1cyBpcyBub3QgdHJhcHBlZCwgY2xvc2UgZHJvcGRvd24gb24gZm9jdXMgb3V0XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJfYmFja3dhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyh2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoMCkpIHx8IF90aGlzLiRlbGVtZW50LmlzKCc6Zm9jdXMnKSkgeyAvLyBsZWZ0IG1vZGFsIHVwd2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gbGFzdCBlbGVtZW50XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy50cmFwRm9jdXMpIHsgLy8gaWYgZm9jdXMgc2hhbGwgYmUgdHJhcHBlZFxuICAgICAgICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8vIGlmIGZvY3VzIGlzIG5vdCB0cmFwcGVkLCBjbG9zZSBkcm9wZG93biBvbiBmb2N1cyBvdXRcbiAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KS5ub3QodGhpcy4kZWxlbWVudCksXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignY2xpY2suemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpO1xuICAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jY2xvc2VtZVxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xuICAgKi9cbiAgb3BlbigpIHtcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIG90aGVyIG9wZW4gZHJvcGRvd25zXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYuZHJvcGRvd24nLCB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgLy8gdGhpcy4kZWxlbWVudC8qLnNob3coKSovO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcbiAgICAgICAgJGZvY3VzYWJsZS5lcSgwKS5mb2N1cygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2speyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyBvbmNlIHRoZSBkcm9wZG93biBpcyB2aXNpYmxlLlxuICAgICAqIEBldmVudCBEcm9wZG93biNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLmRyb3Bkb3duJywgW3RoaXMuJGVsZW1lbnRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9wZW4gZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcm9wZG93biNoaWRlXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZighdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiB0cnVlfSk7XG5cbiAgICB0aGlzLiRhbmNob3IucmVtb3ZlQ2xhc3MoJ2hvdmVyJylcbiAgICAgICAgLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG5cbiAgICBpZih0aGlzLmNsYXNzQ2hhbmdlZCl7XG4gICAgICB2YXIgY3VyUG9zaXRpb25DbGFzcyA9IHRoaXMuZ2V0UG9zaXRpb25DbGFzcygpO1xuICAgICAgaWYoY3VyUG9zaXRpb25DbGFzcyl7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoY3VyUG9zaXRpb25DbGFzcyk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5wb3NpdGlvbkNsYXNzKVxuICAgICAgICAgIC8qLmhpZGUoKSovLmNzcyh7aGVpZ2h0OiAnJywgd2lkdGg6ICcnfSk7XG4gICAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5jb3VudGVyID0gNDtcbiAgICAgIHRoaXMudXNlZFBvc2l0aW9ucy5sZW5ndGggPSAwO1xuICAgIH1cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd24nLCBbdGhpcy4kZWxlbWVudF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIGRyb3Bkb3duIHBhbmUncyB2aXNpYmlsaXR5LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZih0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpe1xuICAgICAgaWYodGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJykpIHJldHVybjtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMub3BlbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgZHJvcGRvd24uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXInKS5oaWRlKCk7XG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmLmRyb3Bkb3duJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuRHJvcGRvd24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBvcGVuaW5nIGEgc3VibWVudSBvbiBob3ZlciBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHN1Ym1lbnVzIHRvIG9wZW4gb24gaG92ZXIgZXZlbnRzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIERvbid0IGNsb3NlIGRyb3Bkb3duIHdoZW4gaG92ZXJpbmcgb3ZlciBkcm9wZG93biBwYW5lXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgaG92ZXJQYW5lOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIHZPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIGJldHdlZW4gdGhlIGRyb3Bkb3duIHBhbmUgYW5kIHRoZSB0cmlnZ2VyaW5nIGVsZW1lbnQgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBoT2Zmc2V0OiAxLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBhZGp1c3Qgb3BlbiBwb3NpdGlvbi4gSlMgd2lsbCB0ZXN0IGFuZCBmaWxsIHRoaXMgaW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byB0cmFwIGZvY3VzIHRvIHRoZSBkcm9wZG93biBwYW5lIGlmIG9wZW5lZCB3aXRoIGtleWJvYXJkIGNvbW1hbmRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byBzZXQgZm9jdXMgdG8gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IHdpdGhpbiB0aGUgcGFuZSwgcmVnYXJkbGVzcyBvZiBtZXRob2Qgb2Ygb3BlbmluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkgdG8gY2xvc2UgdGhlIGRyb3Bkb3duLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcblxuICBfaXNWZXJ0aWNhbCgpIHtcbiAgICByZXR1cm4gdGhpcy4kdGFicy5jc3MoJ2Rpc3BsYXknKSA9PT0gJ2Jsb2NrJztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxuICAgICAgICBwYXJDbGFzcyA9ICdpcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCc7XG5cbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcbiAgICB2YXIgaGFuZGxlQ2xpY2tGbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCBgLiR7cGFyQ2xhc3N9YCksXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxuICAgICAgICAgIGhhc0NsaWNrZWQgPSAkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG5cbiAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgaWYgKGhhc0NsaWNrZWQpIHtcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYoX3RoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2tJbnNpZGUpe1xuICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuIHx8IGhhc1RvdWNoKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ2NsaWNrLnpmLmRyb3Bkb3dubWVudSB0b3VjaHN0YXJ0LnpmLmRyb3Bkb3dubWVudScsIGhhbmRsZUNsaWNrRm4pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVIb3Zlcikge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdtb3VzZWVudGVyLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcblxuICAgICAgICBpZiAoaGFzU3ViKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuICAgICAgICBpZiAoaGFzU3ViICYmIF90aGlzLm9wdGlvbnMuYXV0b2Nsb3NlKSB7XG4gICAgICAgICAgaWYgKCRlbGVtLmF0dHIoJ2RhdGEtaXMtY2xpY2snKSA9PT0gJ3RydWUnICYmIF90aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmRlbGF5KTtcbiAgICAgICAgICBfdGhpcy5kZWxheSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5jbG9zaW5nVGltZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLiRtZW51SXRlbXMub24oJ2tleWRvd24uemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdbcm9sZT1cIm1lbnVpdGVtXCJdJyksXG4gICAgICAgICAgaXNUYWIgPSBfdGhpcy4kdGFicy5pbmRleCgkZWxlbWVudCkgPiAtMSxcbiAgICAgICAgICAkZWxlbWVudHMgPSBpc1RhYiA/IF90aGlzLiR0YWJzIDogJGVsZW1lbnQuc2libGluZ3MoJ2xpJykuYWRkKCRlbGVtZW50KSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShpLTEpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBuZXh0U2libGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoISRlbGVtZW50LmlzKCc6bGFzdC1jaGlsZCcpKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHByZXZTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRwcmV2RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sIG9wZW5TdWIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRzdWIgPSAkZWxlbWVudC5jaGlsZHJlbigndWwuaXMtZHJvcGRvd24tc3VibWVudScpO1xuICAgICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdsaSA+IGE6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgICB9LCBjbG9zZVN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL2lmICgkZWxlbWVudC5pcygnOmZpcnN0LWNoaWxkJykpIHtcbiAgICAgICAgdmFyIGNsb3NlID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKTtcbiAgICAgICAgY2xvc2UuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICBfdGhpcy5faGlkZShjbG9zZSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy99XG4gICAgICB9O1xuICAgICAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICAgICAgb3Blbjogb3BlblN1YixcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBfdGhpcy4kbWVudUl0ZW1zLmZpbmQoJ2E6Zmlyc3QnKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAoaXNUYWIpIHtcbiAgICAgICAgaWYgKF90aGlzLl9pc1ZlcnRpY2FsKCkpIHsgLy8gdmVydGljYWwgbWVudVxuICAgICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBob3Jpem9udGFsIG1lbnVcbiAgICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgbmV4dDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgZG93bjogb3BlblN1YixcbiAgICAgICAgICAgICAgdXA6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBuZXh0OiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgcHJldmlvdXM6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLy8gbm90IHRhYnMgLT4gb25lIHN1YlxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBvcGVuU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duTWVudScsIGZ1bmN0aW9ucyk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKVxuICAgICAgICAgLm9uKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgIHZhciAkbGluayA9IF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpO1xuICAgICAgICAgICBpZiAoJGxpbmsubGVuZ3RoKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgIF90aGlzLl9oaWRlKCk7XG4gICAgICAgICAgICRib2R5Lm9mZignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGRyb3Bkb3duIHBhbmUsIGFuZCBjaGVja3MgZm9yIGNvbGxpc2lvbnMgZmlyc3QuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkc3ViIC0gdWwgZWxlbWVudCB0aGF0IGlzIGEgc3VibWVudSB0byBzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I3Nob3dcbiAgICovXG4gIF9zaG93KCRzdWIpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy4kdGFicy5pbmRleCh0aGlzLiR0YWJzLmZpbHRlcihmdW5jdGlvbihpLCBlbCkge1xuICAgICAgcmV0dXJuICQoZWwpLmZpbmQoJHN1YikubGVuZ3RoID4gMDtcbiAgICB9KSk7XG4gICAgdmFyICRzaWJzID0gJHN1Yi5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jykuc2libGluZ3MoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgdGhpcy5faGlkZSgkc2licywgaWR4KTtcbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5hZGRDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7J2FyaWEtaGlkZGVuJzogZmFsc2V9KVxuICAgICAgICAucGFyZW50KCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgdmFyIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICBpZiAoIWNsZWFyKSB7XG4gICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAnLXJpZ2h0JyA6ICctbGVmdCcsXG4gICAgICAgICAgJHBhcmVudExpID0gJHN1Yi5wYXJlbnQoJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucyR7b2xkQ2xhc3N9YCkuYWRkQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKTtcbiAgICAgIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICAgIGlmICghY2xlYXIpIHtcbiAgICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YCkuYWRkQ2xhc3MoJ29wZW5zLWlubmVyJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICcnKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykgeyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbmV3IGRyb3Bkb3duIHBhbmUgaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYuZHJvcGRvd25tZW51JywgWyRzdWJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyBhIHNpbmdsZSwgY3VycmVudGx5IG9wZW4gZHJvcGRvd24gcGFuZSwgaWYgcGFzc2VkIGEgcGFyYW1ldGVyLCBvdGhlcndpc2UsIGhpZGVzIGV2ZXJ5dGhpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIGhpZGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIGluZGV4IG9mIHRoZSAkdGFicyBjb2xsZWN0aW9uIHRvIGhpZGVcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oaWRlKCRlbGVtLCBpZHgpIHtcbiAgICB2YXIgJHRvQ2xvc2U7XG4gICAgaWYgKCRlbGVtICYmICRlbGVtLmxlbmd0aCkge1xuICAgICAgJHRvQ2xvc2UgPSAkZWxlbTtcbiAgICB9IGVsc2UgaWYgKGlkeCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJHRhYnMubm90KGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICAgIHJldHVybiBpID09PSBpZHg7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJGVsZW1lbnQ7XG4gICAgfVxuICAgIHZhciBzb21ldGhpbmdUb0Nsb3NlID0gJHRvQ2xvc2UuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIHx8ICR0b0Nsb3NlLmZpbmQoJy5pcy1hY3RpdmUnKS5sZW5ndGggPiAwO1xuXG4gICAgaWYgKHNvbWV0aGluZ1RvQ2xvc2UpIHtcbiAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWFjdGl2ZScpLmFkZCgkdG9DbG9zZSkuYXR0cih7XG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICAgICdkYXRhLWlzLWNsaWNrJzogZmFsc2VcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICAgJHRvQ2xvc2UuZmluZCgndWwuanMtZHJvcGRvd24tYWN0aXZlJykuYXR0cih7XG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWVcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdqcy1kcm9wZG93bi1hY3RpdmUnKTtcblxuICAgICAgaWYgKHRoaXMuY2hhbmdlZCB8fCAkdG9DbG9zZS5maW5kKCdvcGVucy1pbm5lcicpLmxlbmd0aCkge1xuICAgICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAncmlnaHQnIDogJ2xlZnQnO1xuICAgICAgICAkdG9DbG9zZS5maW5kKCdsaS5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpLmFkZCgkdG9DbG9zZSlcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoYG9wZW5zLWlubmVyIG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgb3BlbnMtJHtvbGRDbGFzc31gKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VkID0gZmFsc2U7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG9wZW4gbWVudXMgYXJlIGNsb3NlZC5cbiAgICAgICAqIEBldmVudCBEcm9wZG93bk1lbnUjaGlkZVxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2hpZGUuemYuZHJvcGRvd25tZW51JywgWyR0b0Nsb3NlXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBwbHVnaW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRtZW51SXRlbXMub2ZmKCcuemYuZHJvcGRvd25tZW51JykucmVtb3ZlQXR0cignZGF0YS1pcy1jbGljaycpXG4gICAgICAgIC5yZW1vdmVDbGFzcygnaXMtcmlnaHQtYXJyb3cgaXMtbGVmdC1hcnJvdyBpcy1kb3duLWFycm93IG9wZW5zLXJpZ2h0IG9wZW5zLWxlZnQgb3BlbnMtaW5uZXInKTtcbiAgICAkKGRvY3VtZW50LmJvZHkpLm9mZignLnpmLmRyb3Bkb3dubWVudScpO1xuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdkcm9wZG93bicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5Ecm9wZG93bk1lbnUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBEaXNhbGxvd3MgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyBzdWJtZW51c1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlSG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIGF1dG9tYXRpY2FsbHkgY2xvc2Ugb24gYSBtb3VzZWxlYXZlIGV2ZW50LCBpZiBub3QgY2xpY2tlZCBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGF1dG9jbG9zZTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IG9wZW5pbmcgYSBzdWJtZW51IG9uIGhvdmVyIGV2ZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBob3ZlckRlbGF5OiA1MCxcbiAgLyoqXG4gICAqIEFsbG93IGEgc3VibWVudSB0byBvcGVuL3JlbWFpbiBvcGVuIG9uIHBhcmVudCBjbGljayBldmVudC4gQWxsb3dzIGN1cnNvciB0byBtb3ZlIGF3YXkgZnJvbSBtZW51LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsaWNrT3BlbjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBjbG9zaW5nIGEgc3VibWVudSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuXG4gIGNsb3NpbmdUaW1lOiA1MDAsXG4gIC8qKlxuICAgKiBQb3NpdGlvbiBvZiB0aGUgbWVudSByZWxhdGl2ZSB0byB3aGF0IGRpcmVjdGlvbiB0aGUgc3VibWVudXMgc2hvdWxkIG9wZW4uIEhhbmRsZWQgYnkgSlMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2xlZnQnXG4gICAqL1xuICBhbGlnbm1lbnQ6ICdsZWZ0JyxcbiAgLyoqXG4gICAqIEFsbG93IGNsaWNrcyBvbiB0aGUgYm9keSB0byBjbG9zZSBhbnkgb3BlbiBzdWJtZW51cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvdyBjbGlja3Mgb24gbGVhZiBhbmNob3IgbGlua3MgdG8gY2xvc2UgYW55IG9wZW4gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrSW5zaWRlOiB0cnVlLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB2ZXJ0aWNhbCBvcmllbnRlZCBtZW51cywgRm91bmRhdGlvbiBkZWZhdWx0IGlzIGB2ZXJ0aWNhbGAuIFVwZGF0ZSB0aGlzIGlmIHVzaW5nIHlvdXIgb3duIGNsYXNzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd2ZXJ0aWNhbCdcbiAgICovXG4gIHZlcnRpY2FsQ2xhc3M6ICd2ZXJ0aWNhbCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHJpZ2h0LXNpZGUgb3JpZW50ZWQgbWVudXMsIEZvdW5kYXRpb24gZGVmYXVsdCBpcyBgYWxpZ24tcmlnaHRgLiBVcGRhdGUgdGhpcyBpZiB1c2luZyB5b3VyIG93biBjbGFzcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnYWxpZ24tcmlnaHQnXG4gICAqL1xuICByaWdodENsYXNzOiAnYWxpZ24tcmlnaHQnLFxuICAvKipcbiAgICogQm9vbGVhbiB0byBmb3JjZSBvdmVyaWRlIHRoZSBjbGlja2luZyBvZiBsaW5rcyB0byBwZXJmb3JtIGRlZmF1bHQgYWN0aW9uLCBvbiBzZWNvbmQgdG91Y2ggZXZlbnQgZm9yIG1vYmlsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZm9yY2VGb2xsb3c6IHRydWVcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93bk1lbnUsICdEcm9wZG93bk1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEVxdWFsaXplciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uZXF1YWxpemVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudGltZXJBbmRJbWFnZUxvYWRlciBpZiBlcXVhbGl6ZXIgY29udGFpbnMgaW1hZ2VzXG4gKi9cblxuY2xhc3MgRXF1YWxpemVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgRXF1YWxpemVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEVxdWFsaXplciNpbml0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhZGQgdGhlIHRyaWdnZXIgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyAgPSAkLmV4dGVuZCh7fSwgRXF1YWxpemVyLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdFcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgRXF1YWxpemVyIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBlcXVhbGl6ZXIgZnVuY3Rpb25pbmcgb24gbG9hZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBlcUlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLWVxdWFsaXplcicpIHx8ICcnO1xuICAgIHZhciAkd2F0Y2hlZCA9IHRoaXMuJGVsZW1lbnQuZmluZChgW2RhdGEtZXF1YWxpemVyLXdhdGNoPVwiJHtlcUlkfVwiXWApO1xuXG4gICAgdGhpcy4kd2F0Y2hlZCA9ICR3YXRjaGVkLmxlbmd0aCA/ICR3YXRjaGVkIDogdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1lcXVhbGl6ZXItd2F0Y2hdJyk7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLXJlc2l6ZScsIChlcUlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2VxJykpKTtcblxuICAgIHRoaXMuaGFzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1lcXVhbGl6ZXJdJykubGVuZ3RoID4gMDtcbiAgICB0aGlzLmlzTmVzdGVkID0gdGhpcy4kZWxlbWVudC5wYXJlbnRzVW50aWwoZG9jdW1lbnQuYm9keSwgJ1tkYXRhLWVxdWFsaXplcl0nKS5sZW5ndGggPiAwO1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgIHRoaXMuX2JpbmRIYW5kbGVyID0ge1xuICAgICAgb25SZXNpemVNZUJvdW5kOiB0aGlzLl9vblJlc2l6ZU1lLmJpbmQodGhpcyksXG4gICAgICBvblBvc3RFcXVhbGl6ZWRCb3VuZDogdGhpcy5fb25Qb3N0RXF1YWxpemVkLmJpbmQodGhpcylcbiAgICB9O1xuXG4gICAgdmFyIGltZ3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2ltZycpO1xuICAgIHZhciB0b29TbWFsbDtcbiAgICBpZih0aGlzLm9wdGlvbnMuZXF1YWxpemVPbil7XG4gICAgICB0b29TbWFsbCA9IHRoaXMuX2NoZWNrTVEoKTtcbiAgICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fY2hlY2tNUS5iaW5kKHRoaXMpKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgIH1cbiAgICBpZigodG9vU21hbGwgIT09IHVuZGVmaW5lZCAmJiB0b29TbWFsbCA9PT0gZmFsc2UpIHx8IHRvb1NtYWxsID09PSB1bmRlZmluZWQpe1xuICAgICAgaWYoaW1ncy5sZW5ndGgpe1xuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKGltZ3MsIHRoaXMuX3JlZmxvdy5iaW5kKHRoaXMpKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLl9yZWZsb3coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBsaXN0ZW5lcnMgaWYgdGhlIGJyZWFrcG9pbnQgaXMgdG9vIHNtYWxsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhdXNlRXZlbnRzKCkge1xuICAgIHRoaXMuaXNPbiA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKHtcbiAgICAgICcuemYuZXF1YWxpemVyJzogdGhpcy5fYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmQsXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IHRoaXMuX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGZ1bmN0aW9uIHRvIGhhbmRsZSAkZWxlbWVudHMgcmVzaXplbWUuemYudHJpZ2dlciwgd2l0aCBib3VuZCB0aGlzIG9uIF9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vblJlc2l6ZU1lKGUpIHtcbiAgICB0aGlzLl9yZWZsb3coKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmdW5jdGlvbiB0byBoYW5kbGUgJGVsZW1lbnRzIHBvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfb25Qb3N0RXF1YWxpemVkKGUpIHtcbiAgICBpZihlLnRhcmdldCAhPT0gdGhpcy4kZWxlbWVudFswXSl7IHRoaXMuX3JlZmxvdygpOyB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBFcXVhbGl6ZXIuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fcGF1c2VFdmVudHMoKTtcbiAgICBpZih0aGlzLmhhc05lc3RlZCl7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUG9zdEVxdWFsaXplZEJvdW5kKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCB0aGlzLl9iaW5kSGFuZGxlci5vblJlc2l6ZU1lQm91bmQpO1xuICAgIH1cbiAgICB0aGlzLmlzT24gPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBicmVha3BvaW50IHRvIHRoZSBtaW5pbXVtIHJlcXVpcmVkIHNpemUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hlY2tNUSgpIHtcbiAgICB2YXIgdG9vU21hbGwgPSAhRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmVxdWFsaXplT24pO1xuICAgIGlmKHRvb1NtYWxsKXtcbiAgICAgIGlmKHRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgaWYoIXRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdG9vU21hbGw7XG4gIH1cblxuICAvKipcbiAgICogQSBub29wIHZlcnNpb24gZm9yIHRoZSBwbHVnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9raWxsc3dpdGNoKCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBFcXVhbGl6ZXIgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIGlmKCF0aGlzLm9wdGlvbnMuZXF1YWxpemVPblN0YWNrKXtcbiAgICAgIGlmKHRoaXMuX2lzU3RhY2tlZCgpKXtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lcXVhbGl6ZUJ5Um93KSB7XG4gICAgICB0aGlzLmdldEhlaWdodHNCeVJvdyh0aGlzLmFwcGx5SGVpZ2h0QnlSb3cuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmdldEhlaWdodHModGhpcy5hcHBseUhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFudWFsbHkgZGV0ZXJtaW5lcyBpZiB0aGUgZmlyc3QgMiBlbGVtZW50cyBhcmUgKk5PVCogc3RhY2tlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pc1N0YWNrZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuJHdhdGNoZWRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICE9PSB0aGlzLiR3YXRjaGVkWzFdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgb3V0ZXIgaGVpZ2h0cyBvZiBjaGlsZHJlbiBjb250YWluZWQgd2l0aGluIGFuIEVxdWFsaXplciBwYXJlbnQgYW5kIHJldHVybnMgdGhlbSBpbiBhbiBhcnJheVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIEEgbm9uLW9wdGlvbmFsIGNhbGxiYWNrIHRvIHJldHVybiB0aGUgaGVpZ2h0cyBhcnJheSB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKi9cbiAgZ2V0SGVpZ2h0cyhjYikge1xuICAgIHZhciBoZWlnaHRzID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIGhlaWdodHMucHVzaCh0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodCk7XG4gICAgfVxuICAgIGNiKGhlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICovXG4gIGdldEhlaWdodHNCeVJvdyhjYikge1xuICAgIHZhciBsYXN0RWxUb3BPZmZzZXQgPSAodGhpcy4kd2F0Y2hlZC5sZW5ndGggPyB0aGlzLiR3YXRjaGVkLmZpcnN0KCkub2Zmc2V0KCkudG9wIDogMCksXG4gICAgICAgIGdyb3VwcyA9IFtdLFxuICAgICAgICBncm91cCA9IDA7XG4gICAgLy9ncm91cCBieSBSb3dcbiAgICBncm91cHNbZ3JvdXBdID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIC8vbWF5YmUgY291bGQgdXNlIHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0VG9wXG4gICAgICB2YXIgZWxPZmZzZXRUb3AgPSAkKHRoaXMuJHdhdGNoZWRbaV0pLm9mZnNldCgpLnRvcDtcbiAgICAgIGlmIChlbE9mZnNldFRvcCE9bGFzdEVsVG9wT2Zmc2V0KSB7XG4gICAgICAgIGdyb3VwKys7XG4gICAgICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICAgICAgbGFzdEVsVG9wT2Zmc2V0PWVsT2Zmc2V0VG9wO1xuICAgICAgfVxuICAgICAgZ3JvdXBzW2dyb3VwXS5wdXNoKFt0aGlzLiR3YXRjaGVkW2ldLHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0XSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDAsIGxuID0gZ3JvdXBzLmxlbmd0aDsgaiA8IGxuOyBqKyspIHtcbiAgICAgIHZhciBoZWlnaHRzID0gJChncm91cHNbal0pLm1hcChmdW5jdGlvbigpeyByZXR1cm4gdGhpc1sxXTsgfSkuZ2V0KCk7XG4gICAgICB2YXIgbWF4ICAgICAgICAgPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcbiAgICAgIGdyb3Vwc1tqXS5wdXNoKG1heCk7XG4gICAgfVxuICAgIGNiKGdyb3Vwcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3RcbiAgICogQHBhcmFtIHthcnJheX0gaGVpZ2h0cyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAqL1xuICBhcHBseUhlaWdodChoZWlnaHRzKSB7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG5cbiAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgbWF4KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0IGJ5IHJvd1xuICAgKiBAcGFyYW0ge2FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkUm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFJvd1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0QnlSb3coZ3JvdXBzKSB7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGdyb3Vwcy5sZW5ndGg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgIHZhciBncm91cHNJTGVuZ3RoID0gZ3JvdXBzW2ldLmxlbmd0aCxcbiAgICAgICAgICBtYXggPSBncm91cHNbaV1bZ3JvdXBzSUxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGdyb3Vwc0lMZW5ndGg8PTIpIHtcbiAgICAgICAgJChncm91cHNbaV1bMF1bMF0pLmNzcyh7J2hlaWdodCc6J2F1dG8nfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIHBlciByb3cgYXJlIGFwcGxpZWRcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZFJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgICBmb3IgKHZhciBqID0gMCwgbGVuSiA9IChncm91cHNJTGVuZ3RoLTEpOyBqIDwgbGVuSiA7IGorKykge1xuICAgICAgICAkKGdyb3Vwc1tpXVtqXVswXSkuY3NzKHsnaGVpZ2h0JzptYXh9KTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgcGVyIHJvdyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZFJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBFcXVhbGl6ZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkVxdWFsaXplci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHdoZW4gc3RhY2tlZCBvbiBzbWFsbGVyIHNjcmVlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZXF1YWxpemVPblN0YWNrOiBmYWxzZSxcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHJvdyBieSByb3cuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGVxdWFsaXplQnlSb3c6IGZhbHNlLFxuICAvKipcbiAgICogU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWluaW11bSBicmVha3BvaW50IHNpemUgdGhlIHBsdWdpbiBzaG91bGQgZXF1YWxpemUgaGVpZ2h0cyBvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgZXF1YWxpemVPbjogJydcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihFcXVhbGl6ZXIsICdFcXVhbGl6ZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEludGVyY2hhbmdlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5pbnRlcmNoYW5nZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqL1xuXG5jbGFzcyBJbnRlcmNoYW5nZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEludGVyY2hhbmdlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEludGVyY2hhbmdlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBJbnRlcmNoYW5nZS5kZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSAnJztcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0ludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEludGVyY2hhbmdlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBpbnRlcmNoYW5nZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuX2FkZEJyZWFrcG9pbnRzKCk7XG4gICAgdGhpcy5fZ2VuZXJhdGVSdWxlcygpO1xuICAgIHRoaXMuX3JlZmxvdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgSW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5pbnRlcmNoYW5nZScsIEZvdW5kYXRpb24udXRpbC50aHJvdHRsZSh0aGlzLl9yZWZsb3cuYmluZCh0aGlzKSwgNTApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBJbnRlcmNoYW5nZSB1cG9uIERPTSBjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHZhciBtYXRjaDtcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHJ1bGUsIGJ1dCBvbmx5IHNhdmUgdGhlIGxhc3QgbWF0Y2hcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGlmKHRoaXMucnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSB0aGlzLnJ1bGVzW2ldO1xuXG4gICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShydWxlLnF1ZXJ5KS5tYXRjaGVzKSB7XG4gICAgICAgICAgbWF0Y2ggPSBydWxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB0aGlzLnJlcGxhY2UobWF0Y2gucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEZvdW5kYXRpb24gYnJlYWtwb2ludHMgYW5kIGFkZHMgdGhlbSB0byB0aGUgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTIG9iamVjdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQnJlYWtwb2ludHMoKSB7XG4gICAgZm9yICh2YXIgaSBpbiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkucXVlcmllcykge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzW2ldO1xuICAgICAgICBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnkubmFtZV0gPSBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBJbnRlcmNoYW5nZSBlbGVtZW50IGZvciB0aGUgcHJvdmlkZWQgbWVkaWEgcXVlcnkgKyBjb250ZW50IHBhaXJpbmdzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdGhhdCBpcyBhbiBJbnRlcmNoYW5nZSBpbnN0YW5jZVxuICAgKiBAcmV0dXJucyB7QXJyYXl9IHNjZW5hcmlvcyAtIEFycmF5IG9mIG9iamVjdHMgdGhhdCBoYXZlICdtcScgYW5kICdwYXRoJyBrZXlzIHdpdGggY29ycmVzcG9uZGluZyBrZXlzXG4gICAqL1xuICBfZ2VuZXJhdGVSdWxlcyhlbGVtZW50KSB7XG4gICAgdmFyIHJ1bGVzTGlzdCA9IFtdO1xuICAgIHZhciBydWxlcztcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucnVsZXMpIHtcbiAgICAgIHJ1bGVzID0gdGhpcy5vcHRpb25zLnJ1bGVzO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdpbnRlcmNoYW5nZScpLm1hdGNoKC9cXFsuKj9cXF0vZyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBydWxlcykge1xuICAgICAgaWYocnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tpXS5zbGljZSgxLCAtMSkuc3BsaXQoJywgJyk7XG4gICAgICAgIHZhciBwYXRoID0gcnVsZS5zbGljZSgwLCAtMSkuam9pbignJyk7XG4gICAgICAgIHZhciBxdWVyeSA9IHJ1bGVbcnVsZS5sZW5ndGggLSAxXTtcblxuICAgICAgICBpZiAoSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XSkge1xuICAgICAgICAgIHF1ZXJ5ID0gSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bGVzTGlzdC5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIHF1ZXJ5OiBxdWVyeVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJ1bGVzID0gcnVsZXNMaXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgYHNyY2AgcHJvcGVydHkgb2YgYW4gaW1hZ2UsIG9yIGNoYW5nZSB0aGUgSFRNTCBvZiBhIGNvbnRhaW5lciwgdG8gdGhlIHNwZWNpZmllZCBwYXRoLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggLSBQYXRoIHRvIHRoZSBpbWFnZSBvciBIVE1MIHBhcnRpYWwuXG4gICAqIEBmaXJlcyBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgKi9cbiAgcmVwbGFjZShwYXRoKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFBhdGggPT09IHBhdGgpIHJldHVybjtcblxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHRyaWdnZXIgPSAncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnO1xuXG4gICAgLy8gUmVwbGFjaW5nIGltYWdlc1xuICAgIGlmICh0aGlzLiRlbGVtZW50WzBdLm5vZGVOYW1lID09PSAnSU1HJykge1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdzcmMnLCBwYXRoKS5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KVxuICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBiYWNrZ3JvdW5kIGltYWdlc1xuICAgIGVsc2UgaWYgKHBhdGgubWF0Y2goL1xcLihnaWZ8anBnfGpwZWd8cG5nfHN2Z3x0aWZmKShbPyNdLiopPy9pKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3MoeyAnYmFja2dyb3VuZC1pbWFnZSc6ICd1cmwoJytwYXRoKycpJyB9KVxuICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgIH1cbiAgICAvLyBSZXBsYWNpbmcgSFRNTFxuICAgIGVsc2Uge1xuICAgICAgJC5nZXQocGF0aCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnQuaHRtbChyZXNwb25zZSlcbiAgICAgICAgICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICAgICAgJChyZXNwb25zZSkuZm91bmRhdGlvbigpO1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIGNvbnRlbnQgaW4gYW4gSW50ZXJjaGFuZ2UgZWxlbWVudCBpcyBkb25lIGJlaW5nIGxvYWRlZC5cbiAgICAgKiBAZXZlbnQgSW50ZXJjaGFuZ2UjcmVwbGFjZWRcbiAgICAgKi9cbiAgICAvLyB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3JlcGxhY2VkLnpmLmludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgaW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICAvL1RPRE8gdGhpcy5cbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5JbnRlcmNoYW5nZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFJ1bGVzIHRvIGJlIGFwcGxpZWQgdG8gSW50ZXJjaGFuZ2UgZWxlbWVudHMuIFNldCB3aXRoIHRoZSBgZGF0YS1pbnRlcmNoYW5nZWAgYXJyYXkgbm90YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICovXG4gIHJ1bGVzOiBudWxsXG59O1xuXG5JbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgPSB7XG4gICdsYW5kc2NhcGUnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICAncG9ydHJhaXQnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gICdyZXRpbmEnOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwgb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEludGVyY2hhbmdlLCAnSW50ZXJjaGFuZ2UnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1hZ2VsbGFuIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5tYWdlbGxhblxuICovXG5cbmNsYXNzIE1hZ2VsbGFuIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgTWFnZWxsYW4uXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgTWFnZWxsYW4jaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBNYWdlbGxhbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnTWFnZWxsYW4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWFnZWxsYW4gcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdtYWdlbGxhbicpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kdGFyZ2V0cyA9ICQoJ1tkYXRhLW1hZ2VsbGFuLXRhcmdldF0nKTtcbiAgICB0aGlzLiRsaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnYScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnZGF0YS1yZXNpemUnOiBpZCxcbiAgICAgICdkYXRhLXNjcm9sbCc6IGlkLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICB0aGlzLiRhY3RpdmUgPSAkKCk7XG4gICAgdGhpcy5zY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgYW4gYXJyYXkgb2YgcGl4ZWwgdmFsdWVzIHRoYXQgYXJlIHRoZSBkZW1hcmNhdGlvbiBsaW5lcyBiZXR3ZWVuIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAgICogQ2FuIGJlIGludm9rZWQgaWYgbmV3IGVsZW1lbnRzIGFyZSBhZGRlZCBvciB0aGUgc2l6ZSBvZiBhIGxvY2F0aW9uIGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgY2FsY1BvaW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBib2R5ID0gZG9jdW1lbnQuYm9keSxcbiAgICAgICAgaHRtbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdGhpcy53aW5IZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KHdpbmRvdy5pbm5lckhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQpKTtcbiAgICB0aGlzLmRvY0hlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KSk7XG5cbiAgICB0aGlzLiR0YXJnZXRzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkdGFyID0gJCh0aGlzKSxcbiAgICAgICAgICBwdCA9IE1hdGgucm91bmQoJHRhci5vZmZzZXQoKS50b3AgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCk7XG4gICAgICAkdGFyLnRhcmdldFBvaW50ID0gcHQ7XG4gICAgICBfdGhpcy5wb2ludHMucHVzaChwdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBNYWdlbGxhbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgJGJvZHkgPSAkKCdodG1sLCBib2R5JyksXG4gICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgZHVyYXRpb246IF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgZWFzaW5nOiAgIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nXG4gICAgICAgIH07XG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCl7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgICAgaWYobG9jYXRpb24uaGFzaCl7XG4gICAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MobG9jYXRpb24uaGFzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF90aGlzLmNhbGNQb2ludHMoKTtcbiAgICAgIF90aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLnJlZmxvdy5iaW5kKHRoaXMpLFxuICAgICAgJ3Njcm9sbG1lLnpmLnRyaWdnZXInOiB0aGlzLl91cGRhdGVBY3RpdmUuYmluZCh0aGlzKVxuICAgIH0pLm9uKCdjbGljay56Zi5tYWdlbGxhbicsICdhW2hyZWZePVwiI1wiXScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgYXJyaXZhbCAgID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MoYXJyaXZhbCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRnVuY3Rpb24gdG8gc2Nyb2xsIHRvIGEgZ2l2ZW4gbG9jYXRpb24gb24gdGhlIHBhZ2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2MgLSBhIHByb3Blcmx5IGZvcm1hdHRlZCBqUXVlcnkgaWQgc2VsZWN0b3IuIEV4YW1wbGU6ICcjZm9vJ1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNjcm9sbFRvTG9jKGxvYykge1xuICAgIC8vIERvIG5vdGhpbmcgaWYgdGFyZ2V0IGRvZXMgbm90IGV4aXN0IHRvIHByZXZlbnQgZXJyb3JzXG4gICAgaWYgKCEkKGxvYykubGVuZ3RoKSB7cmV0dXJuIGZhbHNlO31cbiAgICB2YXIgc2Nyb2xsUG9zID0gTWF0aC5yb3VuZCgkKGxvYykub2Zmc2V0KCkudG9wIC0gdGhpcy5vcHRpb25zLnRocmVzaG9sZCAvIDIgLSB0aGlzLm9wdGlvbnMuYmFyT2Zmc2V0KTtcblxuICAgICQoJ2h0bWwsIGJvZHknKS5zdG9wKHRydWUpLmFuaW1hdGUoeyBzY3JvbGxUb3A6IHNjcm9sbFBvcyB9LCB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sIHRoaXMub3B0aW9ucy5hbmltYXRpb25FYXNpbmcpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIE1hZ2VsbGFuIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJlZmxvdygpIHtcbiAgICB0aGlzLmNhbGNQb2ludHMoKTtcbiAgICB0aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSB2aXNpYmlsaXR5IG9mIGFuIGFjdGl2ZSBsb2NhdGlvbiBsaW5rLCBhbmQgdXBkYXRlcyB0aGUgdXJsIGhhc2ggZm9yIHRoZSBwYWdlLCBpZiBkZWVwTGlua2luZyBlbmFibGVkLlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIE1hZ2VsbGFuI3VwZGF0ZVxuICAgKi9cbiAgX3VwZGF0ZUFjdGl2ZSgvKmV2dCwgZWxlbSwgc2Nyb2xsUG9zKi8pIHtcbiAgICB2YXIgd2luUG9zID0gLypzY3JvbGxQb3MgfHwqLyBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKSxcbiAgICAgICAgY3VySWR4O1xuXG4gICAgaWYod2luUG9zICsgdGhpcy53aW5IZWlnaHQgPT09IHRoaXMuZG9jSGVpZ2h0KXsgY3VySWR4ID0gdGhpcy5wb2ludHMubGVuZ3RoIC0gMTsgfVxuICAgIGVsc2UgaWYod2luUG9zIDwgdGhpcy5wb2ludHNbMF0peyBjdXJJZHggPSAwOyB9XG4gICAgZWxzZXtcbiAgICAgIHZhciBpc0Rvd24gPSB0aGlzLnNjcm9sbFBvcyA8IHdpblBvcyxcbiAgICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICAgY3VyVmlzaWJsZSA9IHRoaXMucG9pbnRzLmZpbHRlcihmdW5jdGlvbihwLCBpKXtcbiAgICAgICAgICAgIHJldHVybiBpc0Rvd24gPyBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgPD0gd2luUG9zIDogcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQgPD0gd2luUG9zO1xuICAgICAgICAgIH0pO1xuICAgICAgY3VySWR4ID0gY3VyVmlzaWJsZS5sZW5ndGggPyBjdXJWaXNpYmxlLmxlbmd0aCAtIDEgOiAwO1xuICAgIH1cblxuICAgIHRoaXMuJGFjdGl2ZS5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuICAgIHRoaXMuJGFjdGl2ZSA9IHRoaXMuJGxpbmtzLmZpbHRlcignW2hyZWY9XCIjJyArIHRoaXMuJHRhcmdldHMuZXEoY3VySWR4KS5kYXRhKCdtYWdlbGxhbi10YXJnZXQnKSArICdcIl0nKS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgIHZhciBoYXNoID0gdGhpcy4kYWN0aXZlWzBdLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgaWYod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKXtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIGhhc2gpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNjcm9sbFBvcyA9IHdpblBvcztcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIG1hZ2VsbGFuIGlzIGZpbmlzaGVkIHVwZGF0aW5nIHRvIHRoZSBuZXcgYWN0aXZlIGVsZW1lbnQuXG4gICAgICogQGV2ZW50IE1hZ2VsbGFuI3VwZGF0ZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigndXBkYXRlLnpmLm1hZ2VsbGFuJywgW3RoaXMuJGFjdGl2ZV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIE1hZ2VsbGFuIGFuZCByZXNldHMgdGhlIHVybCBvZiB0aGUgd2luZG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5tYWdlbGxhbicpXG4gICAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3N9YCkucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmFjdGl2ZUNsYXNzKTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5kZWVwTGlua2luZyl7XG4gICAgICB2YXIgaGFzaCA9IHRoaXMuJGFjdGl2ZVswXS5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoaGFzaCwgJycpO1xuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5NYWdlbGxhbi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lLCBpbiBtcywgdGhlIGFuaW1hdGVkIHNjcm9sbGluZyBzaG91bGQgdGFrZSBiZXR3ZWVuIGxvY2F0aW9ucy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXG4gIC8qKlxuICAgKiBBbmltYXRpb24gc3R5bGUgdG8gdXNlIHdoZW4gc2Nyb2xsaW5nIGJldHdlZW4gbG9jYXRpb25zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdlYXNlLWluLW91dCdcbiAgICovXG4gIGFuaW1hdGlvbkVhc2luZzogJ2xpbmVhcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIHRvIHVzZSBhcyBhIG1hcmtlciBmb3IgbG9jYXRpb24gY2hhbmdlcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MFxuICAgKi9cbiAgdGhyZXNob2xkOiA1MCxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGFjdGl2ZSBsb2NhdGlvbnMgbGluayBvbiB0aGUgbWFnZWxsYW4gY29udGFpbmVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdhY3RpdmUnXG4gICAqL1xuICBhY3RpdmVDbGFzczogJ2FjdGl2ZScsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHNjcmlwdCB0byBtYW5pcHVsYXRlIHRoZSB1cmwgb2YgdGhlIGN1cnJlbnQgcGFnZSwgYW5kIGlmIHN1cHBvcnRlZCwgYWx0ZXIgdGhlIGhpc3RvcnkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZGVlcExpbmtpbmc6IGZhbHNlLFxuICAvKipcbiAgICogTnVtYmVyIG9mIHBpeGVscyB0byBvZmZzZXQgdGhlIHNjcm9sbCBvZiB0aGUgcGFnZSBvbiBpdGVtIGNsaWNrIGlmIHVzaW5nIGEgc3RpY2t5IG5hdiBiYXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjVcbiAgICovXG4gIGJhck9mZnNldDogMFxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oTWFnZWxsYW4sICdNYWdlbGxhbicpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogT2ZmQ2FudmFzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5vZmZjYW52YXNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqL1xuXG5jbGFzcyBPZmZDYW52YXMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhbiBvZmYtY2FudmFzIHdyYXBwZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGluaXRpYWxpemUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgT2ZmQ2FudmFzLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy4kbGFzdFRyaWdnZXIgPSAkKCk7XG4gICAgdGhpcy4kdHJpZ2dlcnMgPSAkKCk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdPZmZDYW52YXMnKVxuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ09mZkNhbnZhcycsIHtcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnXG4gICAgfSk7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgb2ZmLWNhbnZhcyB3cmFwcGVyIGJ5IGFkZGluZyB0aGUgZXhpdCBvdmVybGF5IChpZiBuZWVkZWQpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnQuYXR0cignaWQnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgLy8gRmluZCB0cmlnZ2VycyB0aGF0IGFmZmVjdCB0aGlzIGVsZW1lbnQgYW5kIGFkZCBhcmlhLWV4cGFuZGVkIHRvIHRoZW1cbiAgICB0aGlzLiR0cmlnZ2VycyA9ICQoZG9jdW1lbnQpXG4gICAgICAuZmluZCgnW2RhdGEtb3Blbj1cIicraWQrJ1wiXSwgW2RhdGEtY2xvc2U9XCInK2lkKydcIl0sIFtkYXRhLXRvZ2dsZT1cIicraWQrJ1wiXScpXG4gICAgICAuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpXG4gICAgICAuYXR0cignYXJpYS1jb250cm9scycsIGlkKTtcblxuICAgIC8vIEFkZCBhIGNsb3NlIHRyaWdnZXIgb3ZlciB0aGUgYm9keSBpZiBuZWNlc3NhcnlcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgaWYgKCQoJy5qcy1vZmYtY2FudmFzLWV4aXQnKS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy4kZXhpdGVyID0gJCgnLmpzLW9mZi1jYW52YXMtZXhpdCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGV4aXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBleGl0ZXIuc2V0QXR0cmlidXRlKCdjbGFzcycsICdqcy1vZmYtY2FudmFzLWV4aXQnKTtcbiAgICAgICAgJCgnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLmFwcGVuZChleGl0ZXIpO1xuXG4gICAgICAgIHRoaXMuJGV4aXRlciA9ICQoZXhpdGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCA9IHRoaXMub3B0aW9ucy5pc1JldmVhbGVkIHx8IG5ldyBSZWdFeHAodGhpcy5vcHRpb25zLnJldmVhbENsYXNzLCAnZycpLnRlc3QodGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pc1JldmVhbGVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMucmV2ZWFsT24gPSB0aGlzLm9wdGlvbnMucmV2ZWFsT24gfHwgdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyhyZXZlYWwtZm9yLW1lZGl1bXxyZXZlYWwtZm9yLWxhcmdlKS9nKVswXS5zcGxpdCgnLScpWzJdO1xuICAgICAgdGhpcy5fc2V0TVFDaGVja2VyKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lKSB7XG4gICAgICB0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUgPSBwYXJzZUZsb2F0KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCQoJ1tkYXRhLW9mZi1jYW52YXMtd3JhcHBlcl0nKVswXSkudHJhbnNpdGlvbkR1cmF0aW9uKSAqIDEwMDA7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgdG8gdGhlIG9mZi1jYW52YXMgd3JhcHBlciBhbmQgdGhlIGV4aXQgb3ZlcmxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJykub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmNsb3NlLmJpbmQodGhpcyksXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ2tleWRvd24uemYub2ZmY2FudmFzJzogdGhpcy5faGFuZGxlS2V5Ym9hcmQuYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgJiYgdGhpcy4kZXhpdGVyLmxlbmd0aCkge1xuICAgICAgdGhpcy4kZXhpdGVyLm9uKHsnY2xpY2suemYub2ZmY2FudmFzJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgZXZlbnQgbGlzdGVuZXIgZm9yIGVsZW1lbnRzIHRoYXQgd2lsbCByZXZlYWwgYXQgY2VydGFpbiBicmVha3BvaW50cy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRNUUNoZWNrZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QoX3RoaXMub3B0aW9ucy5yZXZlYWxPbikpIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKGZhbHNlKTtcbiAgICAgIH1cbiAgICB9KS5vbmUoJ2xvYWQuemYub2ZmY2FudmFzJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QoX3RoaXMub3B0aW9ucy5yZXZlYWxPbikpIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIHJldmVhbGluZy9oaWRpbmcgdGhlIG9mZi1jYW52YXMgYXQgYnJlYWtwb2ludHMsIG5vdCB0aGUgc2FtZSBhcyBvcGVuLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzUmV2ZWFsZWQgLSB0cnVlIGlmIGVsZW1lbnQgc2hvdWxkIGJlIHJldmVhbGVkLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJldmVhbChpc1JldmVhbGVkKSB7XG4gICAgdmFyICRjbG9zZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpO1xuICAgIGlmIChpc1JldmVhbGVkKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSB0cnVlO1xuICAgICAgLy8gaWYgKCF0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAgIC8vICAgdmFyIHNjcm9sbFBvcyA9IHBhcnNlSW50KHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAvLyAgIHRoaXMuJGVsZW1lbnRbMF0uc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwLCcgKyBzY3JvbGxQb3MgKyAncHgpJztcbiAgICAgIC8vIH1cbiAgICAgIC8vIGlmICh0aGlzLm9wdGlvbnMuaXNTdGlja3kpIHsgdGhpcy5fc3RpY2soKTsgfVxuICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ29wZW4uemYudHJpZ2dlciB0b2dnbGUuemYudHJpZ2dlcicpO1xuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7ICRjbG9zZXIuaGlkZSgpOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaXNSZXZlYWxlZCA9IGZhbHNlO1xuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5pc1N0aWNreSB8fCAhdGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgICAvLyAgIHRoaXMuJGVsZW1lbnRbMF0uc3R5bGUudHJhbnNmb3JtID0gJyc7XG4gICAgICAvLyAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi5vZmZjYW52YXMnKTtcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgICAnb3Blbi56Zi50cmlnZ2VyJzogdGhpcy5vcGVuLmJpbmQodGhpcyksXG4gICAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcylcbiAgICAgIH0pO1xuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7XG4gICAgICAgICRjbG9zZXIuc2hvdygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IC0gRXZlbnQgb2JqZWN0IHBhc3NlZCBmcm9tIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cbiAgICogQGZpcmVzIE9mZkNhbnZhcyNvcGVuZWRcbiAgICovXG4gIG9wZW4oZXZlbnQsIHRyaWdnZXIpIHtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpIHx8IHRoaXMuaXNSZXZlYWxlZCkgeyByZXR1cm47IH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAkYm9keSA9ICQoZG9jdW1lbnQuYm9keSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZvcmNlVG9wKSB7XG4gICAgICAkKCdib2R5Jykuc2Nyb2xsVG9wKDApO1xuICAgIH1cbiAgICAvLyB3aW5kb3cucGFnZVlPZmZzZXQgPSAwO1xuXG4gICAgLy8gaWYgKCF0aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAvLyAgIHZhciBzY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgIC8vICAgdGhpcy4kZWxlbWVudFswXS5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHNjcm9sbFBvcyArICdweCknO1xuICAgIC8vICAgaWYgKHRoaXMuJGV4aXRlci5sZW5ndGgpIHtcbiAgICAvLyAgICAgdGhpcy4kZXhpdGVyWzBdLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgc2Nyb2xsUG9zICsgJ3B4KSc7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIG9mZi1jYW52YXMgbWVudSBvcGVucy5cbiAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI29wZW5lZFxuICAgICAqL1xuXG4gICAgdmFyICR3cmFwcGVyID0gJCgnW2RhdGEtb2ZmLWNhbnZhcy13cmFwcGVyXScpO1xuICAgICR3cmFwcGVyLmFkZENsYXNzKCdpcy1vZmYtY2FudmFzLW9wZW4gaXMtb3Blbi0nKyBfdGhpcy5vcHRpb25zLnBvc2l0aW9uKTtcblxuICAgIF90aGlzLiRlbGVtZW50LmFkZENsYXNzKCdpcy1vcGVuJylcblxuICAgICAgLy8gaWYgKF90aGlzLm9wdGlvbnMuaXNTdGlja3kpIHtcbiAgICAgIC8vICAgX3RoaXMuX3N0aWNrKCk7XG4gICAgICAvLyB9XG5cbiAgICB0aGlzLiR0cmlnZ2Vycy5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ3RydWUnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJylcbiAgICAgICAgLnRyaWdnZXIoJ29wZW5lZC56Zi5vZmZjYW52YXMnKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICB0aGlzLiRleGl0ZXIuYWRkQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZiAodHJpZ2dlcikge1xuICAgICAgdGhpcy4kbGFzdFRyaWdnZXIgPSB0cmlnZ2VyO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKSB7XG4gICAgICAkd3JhcHBlci5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCR3cmFwcGVyKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKF90aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpIHsgLy8gaGFuZGxlIGRvdWJsZSBjbGlja3NcbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsICctMScpO1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7XG4gICAgICAkd3JhcHBlci5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCR3cmFwcGVyKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKF90aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpIHsgLy8gaGFuZGxlIGRvdWJsZSBjbGlja3NcbiAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsICctMScpO1xuICAgICAgICAgIF90aGlzLnRyYXBGb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJhcHMgZm9jdXMgd2l0aGluIHRoZSBvZmZjYW52YXMgb24gb3Blbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF90cmFwRm9jdXMoKSB7XG4gICAgdmFyIGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgZmlyc3QgPSBmb2N1c2FibGUuZXEoMCksXG4gICAgICAgIGxhc3QgPSBmb2N1c2FibGUuZXEoLTEpO1xuXG4gICAgZm9jdXNhYmxlLm9mZignLnpmLm9mZmNhbnZhcycpLm9uKCdrZXlkb3duLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBrZXkgPSBGb3VuZGF0aW9uLktleWJvYXJkLnBhcnNlS2V5KGUpO1xuICAgICAgaWYgKGtleSA9PT0gJ1RBQicgJiYgZS50YXJnZXQgPT09IGxhc3RbMF0pIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBmaXJzdC5mb2N1cygpO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gJ1NISUZUX1RBQicgJiYgZS50YXJnZXQgPT09IGZpcnN0WzBdKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgbGFzdC5mb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgb2ZmY2FudmFzIHRvIGFwcGVhciBzdGlja3kgdXRpbGl6aW5nIHRyYW5zbGF0ZSBwcm9wZXJ0aWVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgLy8gT2ZmQ2FudmFzLnByb3RvdHlwZS5fc3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgLy8gICB2YXIgZWxTdHlsZSA9IHRoaXMuJGVsZW1lbnRbMF0uc3R5bGU7XG4gIC8vXG4gIC8vICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgLy8gICAgIHZhciBleGl0U3R5bGUgPSB0aGlzLiRleGl0ZXJbMF0uc3R5bGU7XG4gIC8vICAgfVxuICAvL1xuICAvLyAgICQod2luZG93KS5vbignc2Nyb2xsLnpmLm9mZmNhbnZhcycsIGZ1bmN0aW9uKGUpIHtcbiAgLy8gICAgIGNvbnNvbGUubG9nKGUpO1xuICAvLyAgICAgdmFyIHBhZ2VZID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuICAvLyAgICAgZWxTdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDAsJyArIHBhZ2VZICsgJ3B4KSc7XG4gIC8vICAgICBpZiAoZXhpdFN0eWxlICE9PSB1bmRlZmluZWQpIHsgZXhpdFN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMCwnICsgcGFnZVkgKyAncHgpJzsgfVxuICAvLyAgIH0pO1xuICAvLyAgIC8vIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc3R1Y2suemYub2ZmY2FudmFzJyk7XG4gIC8vIH07XG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG9mZi1jYW52YXMgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2IgdG8gZmlyZSBhZnRlciBjbG9zdXJlLlxuICAgKiBAZmlyZXMgT2ZmQ2FudmFzI2Nsb3NlZFxuICAgKi9cbiAgY2xvc2UoY2IpIHtcbiAgICBpZiAoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSB8fCB0aGlzLmlzUmV2ZWFsZWQpIHsgcmV0dXJuOyB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gIEZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUsIHRoaXMuJGVsZW1lbnQsIGZ1bmN0aW9uKCkge1xuICAgICQoJ1tkYXRhLW9mZi1jYW52YXMtd3JhcHBlcl0nKS5yZW1vdmVDbGFzcyhgaXMtb2ZmLWNhbnZhcy1vcGVuIGlzLW9wZW4tJHtfdGhpcy5vcHRpb25zLnBvc2l0aW9ufWApO1xuICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKCdpcy1vcGVuJyk7XG4gICAgICAvLyBGb3VuZGF0aW9uLl9yZWZsb3coKTtcbiAgICAvLyB9KTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKVxuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyB3aGVuIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbnMuXG4gICAgICAgKiBAZXZlbnQgT2ZmQ2FudmFzI2Nsb3NlZFxuICAgICAgICovXG4gICAgICAgIC50cmlnZ2VyKCdjbG9zZWQuemYub2ZmY2FudmFzJyk7XG4gICAgLy8gaWYgKF90aGlzLm9wdGlvbnMuaXNTdGlja3kgfHwgIV90aGlzLm9wdGlvbnMuZm9yY2VUb3ApIHtcbiAgICAvLyAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIF90aGlzLiRlbGVtZW50WzBdLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuICAgIC8vICAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYub2ZmY2FudmFzJyk7XG4gICAgLy8gICB9LCB0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUpO1xuICAgIC8vIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykge1xuICAgICAgdGhpcy4kZXhpdGVyLnJlbW92ZUNsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7XG4gICAgICAkKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJykucmVtb3ZlQXR0cigndGFiaW5kZXgnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW4gb3IgY2xvc2VkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IC0gRXZlbnQgb2JqZWN0IHBhc3NlZCBmcm9tIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cbiAgICovXG4gIHRvZ2dsZShldmVudCwgdHJpZ2dlcikge1xuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdpcy1vcGVuJykpIHtcbiAgICAgIHRoaXMuY2xvc2UoZXZlbnQsIHRyaWdnZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMub3BlbihldmVudCwgdHJpZ2dlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMga2V5Ym9hcmQgaW5wdXQgd2hlbiBkZXRlY3RlZC4gV2hlbiB0aGUgZXNjYXBlIGtleSBpcyBwcmVzc2VkLCB0aGUgb2ZmLWNhbnZhcyBtZW51IGNsb3NlcywgYW5kIGZvY3VzIGlzIHJlc3RvcmVkIHRvIHRoZSBlbGVtZW50IHRoYXQgb3BlbmVkIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oYW5kbGVLZXlib2FyZChlKSB7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ09mZkNhbnZhcycsIHtcbiAgICAgIGNsb3NlOiAoKSA9PiB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgdGhpcy4kbGFzdFRyaWdnZXIuZm9jdXMoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgaGFuZGxlZDogKCkgPT4ge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIG9mZmNhbnZhcyBwbHVnaW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmNsb3NlKCk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi50cmlnZ2VyIC56Zi5vZmZjYW52YXMnKTtcbiAgICB0aGlzLiRleGl0ZXIub2ZmKCcuemYub2ZmY2FudmFzJyk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuT2ZmQ2FudmFzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3cgdGhlIHVzZXIgdG8gY2xpY2sgb3V0c2lkZSBvZiB0aGUgbWVudSB0byBjbG9zZSBpdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIGluIG1zIHRoZSBvcGVuIGFuZCBjbG9zZSB0cmFuc2l0aW9uIHJlcXVpcmVzLiBJZiBub25lIHNlbGVjdGVkLCBwdWxscyBmcm9tIGJvZHkgc3R5bGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuICB0cmFuc2l0aW9uVGltZTogMCxcblxuICAvKipcbiAgICogRGlyZWN0aW9uIHRoZSBvZmZjYW52YXMgb3BlbnMgZnJvbS4gRGV0ZXJtaW5lcyBjbGFzcyBhcHBsaWVkIHRvIGJvZHkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgbGVmdFxuICAgKi9cbiAgcG9zaXRpb246ICdsZWZ0JyxcblxuICAvKipcbiAgICogRm9yY2UgdGhlIHBhZ2UgdG8gc2Nyb2xsIHRvIHRvcCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGZvcmNlVG9wOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgb2ZmY2FudmFzIHRvIHJlbWFpbiBvcGVuIGZvciBjZXJ0YWluIGJyZWFrcG9pbnRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBpc1JldmVhbGVkOiBmYWxzZSxcblxuICAvKipcbiAgICogQnJlYWtwb2ludCBhdCB3aGljaCB0byByZXZlYWwuIEpTIHdpbGwgdXNlIGEgUmVnRXhwIHRvIHRhcmdldCBzdGFuZGFyZCBjbGFzc2VzLCBpZiBjaGFuZ2luZyBjbGFzc25hbWVzLCBwYXNzIHlvdXIgY2xhc3Mgd2l0aCB0aGUgYHJldmVhbENsYXNzYCBvcHRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgcmV2ZWFsLWZvci1sYXJnZVxuICAgKi9cbiAgcmV2ZWFsT246IG51bGwsXG5cbiAgLyoqXG4gICAqIEZvcmNlIGZvY3VzIHRvIHRoZSBvZmZjYW52YXMgb24gb3Blbi4gSWYgdHJ1ZSwgd2lsbCBmb2N1cyB0aGUgb3BlbmluZyB0cmlnZ2VyIG9uIGNsb3NlLiBTZXRzIHRhYmluZGV4IG9mIFtkYXRhLW9mZi1jYW52YXMtY29udGVudF0gdG8gLTEgZm9yIGFjY2Vzc2liaWxpdHkgcHVycG9zZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB1c2VkIHRvIGZvcmNlIGFuIG9mZmNhbnZhcyB0byByZW1haW4gb3Blbi4gRm91bmRhdGlvbiBkZWZhdWx0cyBmb3IgdGhpcyBhcmUgYHJldmVhbC1mb3ItbGFyZ2VgICYgYHJldmVhbC1mb3ItbWVkaXVtYC5cbiAgICogQG9wdGlvblxuICAgKiBUT0RPIGltcHJvdmUgdGhlIHJlZ2V4IHRlc3RpbmcgZm9yIHRoaXMuXG4gICAqIEBleGFtcGxlIHJldmVhbC1mb3ItbGFyZ2VcbiAgICovXG4gIHJldmVhbENsYXNzOiAncmV2ZWFsLWZvci0nLFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBvcHRpb25hbCBmb2N1cyB0cmFwcGluZyB3aGVuIG9wZW5pbmcgYW4gb2ZmY2FudmFzLiBTZXRzIHRhYmluZGV4IG9mIFtkYXRhLW9mZi1jYW52YXMtY29udGVudF0gdG8gLTEgZm9yIGFjY2Vzc2liaWxpdHkgcHVycG9zZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgdHJhcEZvY3VzOiBmYWxzZVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oT2ZmQ2FudmFzLCAnT2ZmQ2FudmFzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBPcmJpdCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ub3JiaXRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudG91Y2hcbiAqL1xuXG5jbGFzcyBPcmJpdCB7XG4gIC8qKlxuICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gb3JiaXQgY2Fyb3VzZWwuXG4gICogQGNsYXNzXG4gICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBPcmJpdCBDYXJvdXNlbC5cbiAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBPcmJpdC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT3JiaXQnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdPcmJpdCcsIHtcbiAgICAgICdsdHInOiB7XG4gICAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICB9LFxuICAgICAgJ3J0bCc6IHtcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnbmV4dCcsXG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdwcmV2aW91cydcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgY3JlYXRpbmcgalF1ZXJ5IGNvbGxlY3Rpb25zLCBzZXR0aW5nIGF0dHJpYnV0ZXMsIGFuZCBzdGFydGluZyB0aGUgYW5pbWF0aW9uLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5jb250YWluZXJDbGFzc31gKTtcbiAgICB0aGlzLiRzbGlkZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApO1xuICAgIHZhciAkaW1hZ2VzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbWcnKSxcbiAgICBpbml0QWN0aXZlID0gdGhpcy4kc2xpZGVzLmZpbHRlcignLmlzLWFjdGl2ZScpO1xuXG4gICAgaWYgKCFpbml0QWN0aXZlLmxlbmd0aCkge1xuICAgICAgdGhpcy4kc2xpZGVzLmVxKDApLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VNVUkpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5hZGRDbGFzcygnbm8tbW90aW9udWknKTtcbiAgICB9XG5cbiAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoJGltYWdlcywgdGhpcy5fcHJlcGFyZUZvck9yYml0LmJpbmQodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wcmVwYXJlRm9yT3JiaXQoKTsvL2hlaGVcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgIHRoaXMuX2xvYWRCdWxsZXRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmIHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLmdlb1N5bmMoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc2libGUpIHsgLy8gYWxsb3cgd3JhcHBlciB0byBiZSBmb2N1c2FibGUgdG8gZW5hYmxlIGFycm93IG5hdmlnYXRpb25cbiAgICAgIHRoaXMuJHdyYXBwZXIuYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBDcmVhdGVzIGEgalF1ZXJ5IGNvbGxlY3Rpb24gb2YgYnVsbGV0cywgaWYgdGhleSBhcmUgYmVpbmcgdXNlZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfbG9hZEJ1bGxldHMoKSB7XG4gICAgdGhpcy4kYnVsbGV0cyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmJveE9mQnVsbGV0c31gKS5maW5kKCdidXR0b24nKTtcbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgYSBgdGltZXJgIG9iamVjdCBvbiB0aGUgb3JiaXQsIGFuZCBzdGFydHMgdGhlIGNvdW50ZXIgZm9yIHRoZSBuZXh0IHNsaWRlLlxuICAqIEBmdW5jdGlvblxuICAqL1xuICBnZW9TeW5jKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50aW1lciA9IG5ldyBGb3VuZGF0aW9uLlRpbWVyKFxuICAgICAgdGhpcy4kZWxlbWVudCxcbiAgICAgIHtcbiAgICAgICAgZHVyYXRpb246IHRoaXMub3B0aW9ucy50aW1lckRlbGF5LFxuICAgICAgICBpbmZpbml0ZTogZmFsc2VcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICB9KTtcbiAgICB0aGlzLnRpbWVyLnN0YXJ0KCk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIHdyYXBwZXIgYW5kIHNsaWRlIGhlaWdodHMgZm9yIHRoZSBvcmJpdC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfcHJlcGFyZUZvck9yYml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fc2V0V3JhcHBlckhlaWdodChmdW5jdGlvbihtYXgpe1xuICAgICAgX3RoaXMuX3NldFNsaWRlSGVpZ2h0KG1heCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBDYWx1bGF0ZXMgdGhlIGhlaWdodCBvZiBlYWNoIHNsaWRlIGluIHRoZSBjb2xsZWN0aW9uLCBhbmQgdXNlcyB0aGUgdGFsbGVzdCBvbmUgZm9yIHRoZSB3cmFwcGVyIGhlaWdodC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gYSBjYWxsYmFjayBmdW5jdGlvbiB0byBmaXJlIHdoZW4gY29tcGxldGUuXG4gICovXG4gIF9zZXRXcmFwcGVySGVpZ2h0KGNiKSB7Ly9yZXdyaXRlIHRoaXMgdG8gYGZvcmAgbG9vcFxuICAgIHZhciBtYXggPSAwLCB0ZW1wLCBjb3VudGVyID0gMDtcblxuICAgIHRoaXMuJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgJCh0aGlzKS5hdHRyKCdkYXRhLXNsaWRlJywgY291bnRlcik7XG5cbiAgICAgIGlmIChjb3VudGVyKSB7Ly9pZiBub3QgdGhlIGZpcnN0IHNsaWRlLCBzZXQgY3NzIHBvc2l0aW9uIGFuZCBkaXNwbGF5IHByb3BlcnR5XG4gICAgICAgICQodGhpcykuY3NzKHsncG9zaXRpb24nOiAncmVsYXRpdmUnLCAnZGlzcGxheSc6ICdub25lJ30pO1xuICAgICAgfVxuICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XG4gICAgICBjb3VudGVyKys7XG4gICAgfSk7XG5cbiAgICBpZiAoY291bnRlciA9PT0gdGhpcy4kc2xpZGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy4kd3JhcHBlci5jc3MoeydoZWlnaHQnOiBtYXh9KTsgLy9vbmx5IGNoYW5nZSB0aGUgd3JhcHBlciBoZWlnaHQgcHJvcGVydHkgb25jZS5cbiAgICAgIGNiKG1heCk7IC8vZmlyZSBjYWxsYmFjayB3aXRoIG1heCBoZWlnaHQgZGltZW5zaW9uLlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIFNldHMgdGhlIG1heC1oZWlnaHQgb2YgZWFjaCBzbGlkZS5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfc2V0U2xpZGVIZWlnaHQoaGVpZ2h0KSB7XG4gICAgdGhpcy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLmNzcygnbWF4LWhlaWdodCcsIGhlaWdodCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBiYXNpY2FsbHkgZXZlcnl0aGluZyB3aXRoaW4gdGhlIGVsZW1lbnQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAvLyoqTm93IHVzaW5nIGN1c3RvbSBldmVudCAtIHRoYW5rcyB0bzoqKlxuICAgIC8vKiogICAgICBZb2hhaSBBcmFyYXQgb2YgVG9yb250byAgICAgICoqXG4gICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICBpZiAodGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zd2lwZSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub2ZmKCdzd2lwZWxlZnQuemYub3JiaXQgc3dpcGVyaWdodC56Zi5vcmJpdCcpXG4gICAgICAgIC5vbignc3dpcGVsZWZ0LnpmLm9yYml0JywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICB9KS5vbignc3dpcGVyaWdodC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSkge1xuICAgICAgICB0aGlzLiRzbGlkZXMub24oJ2NsaWNrLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJywgX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICAgIF90aGlzLnRpbWVyW190aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gJ3BhdXNlJyA6ICdzdGFydCddKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucGF1c2VPbkhvdmVyKSB7XG4gICAgICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2VlbnRlci56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMudGltZXIucGF1c2UoKTtcbiAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCFfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSkge1xuICAgICAgICAgICAgICBfdGhpcy50aW1lci5zdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubmF2QnV0dG9ucykge1xuICAgICAgICB2YXIgJGNvbnRyb2xzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubmV4dENsYXNzfSwgLiR7dGhpcy5vcHRpb25zLnByZXZDbGFzc31gKTtcbiAgICAgICAgJGNvbnRyb2xzLmF0dHIoJ3RhYmluZGV4JywgMClcbiAgICAgICAgLy9hbHNvIG5lZWQgdG8gaGFuZGxlIGVudGVyL3JldHVybiBhbmQgc3BhY2ViYXIga2V5IHByZXNzZXNcbiAgICAgICAgLm9uKCdjbGljay56Zi5vcmJpdCB0b3VjaGVuZC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuXHQgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSgkKHRoaXMpLmhhc0NsYXNzKF90aGlzLm9wdGlvbnMubmV4dENsYXNzKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgdGhpcy4kYnVsbGV0cy5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoL2lzLWFjdGl2ZS9nLnRlc3QodGhpcy5jbGFzc05hbWUpKSB7IHJldHVybiBmYWxzZTsgfS8vaWYgdGhpcyBpcyBhY3RpdmUsIGtpY2sgb3V0IG9mIGZ1bmN0aW9uLlxuICAgICAgICAgIHZhciBpZHggPSAkKHRoaXMpLmRhdGEoJ3NsaWRlJyksXG4gICAgICAgICAgbHRyID0gaWR4ID4gX3RoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgICRzbGlkZSA9IF90aGlzLiRzbGlkZXMuZXEoaWR4KTtcblxuICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKGx0ciwgJHNsaWRlLCBpZHgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NpYmxlKSB7XG4gICAgICAgIHRoaXMuJHdyYXBwZXIuYWRkKHRoaXMuJGJ1bGxldHMpLm9uKCdrZXlkb3duLnpmLm9yYml0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnT3JiaXQnLCB7XG4gICAgICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7IC8vIGlmIGJ1bGxldCBpcyBmb2N1c2VkLCBtYWtlIHN1cmUgZm9jdXMgbW92ZXNcbiAgICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKF90aGlzLiRidWxsZXRzKSkge1xuICAgICAgICAgICAgICAgIF90aGlzLiRidWxsZXRzLmZpbHRlcignLmlzLWFjdGl2ZScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ2hhbmdlcyB0aGUgY3VycmVudCBzbGlkZSB0byBhIG5ldyBvbmUuXG4gICogQGZ1bmN0aW9uXG4gICogQHBhcmFtIHtCb29sZWFufSBpc0xUUiAtIGZsYWcgaWYgdGhlIHNsaWRlIHNob3VsZCBtb3ZlIGxlZnQgdG8gcmlnaHQuXG4gICogQHBhcmFtIHtqUXVlcnl9IGNob3NlblNsaWRlIC0gdGhlIGpRdWVyeSBlbGVtZW50IG9mIHRoZSBzbGlkZSB0byBzaG93IG5leHQsIGlmIG9uZSBpcyBzZWxlY3RlZC5cbiAgKiBAcGFyYW0ge051bWJlcn0gaWR4IC0gdGhlIGluZGV4IG9mIHRoZSBuZXcgc2xpZGUgaW4gaXRzIGNvbGxlY3Rpb24sIGlmIG9uZSBjaG9zZW4uXG4gICogQGZpcmVzIE9yYml0I3NsaWRlY2hhbmdlXG4gICovXG4gIGNoYW5nZVNsaWRlKGlzTFRSLCBjaG9zZW5TbGlkZSwgaWR4KSB7XG4gICAgdmFyICRjdXJTbGlkZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5lcSgwKTtcblxuICAgIGlmICgvbXVpL2cudGVzdCgkY3VyU2xpZGVbMF0uY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0gLy9pZiB0aGUgc2xpZGUgaXMgY3VycmVudGx5IGFuaW1hdGluZywga2ljayBvdXQgb2YgdGhlIGZ1bmN0aW9uXG5cbiAgICB2YXIgJGZpcnN0U2xpZGUgPSB0aGlzLiRzbGlkZXMuZmlyc3QoKSxcbiAgICAkbGFzdFNsaWRlID0gdGhpcy4kc2xpZGVzLmxhc3QoKSxcbiAgICBkaXJJbiA9IGlzTFRSID8gJ1JpZ2h0JyA6ICdMZWZ0JyxcbiAgICBkaXJPdXQgPSBpc0xUUiA/ICdMZWZ0JyA6ICdSaWdodCcsXG4gICAgX3RoaXMgPSB0aGlzLFxuICAgICRuZXdTbGlkZTtcblxuICAgIGlmICghY2hvc2VuU2xpZGUpIHsgLy9tb3N0IG9mIHRoZSB0aW1lLCB0aGlzIHdpbGwgYmUgYXV0byBwbGF5ZWQgb3IgY2xpY2tlZCBmcm9tIHRoZSBuYXZCdXR0b25zLlxuICAgICAgJG5ld1NsaWRlID0gaXNMVFIgPyAvL2lmIHdyYXBwaW5nIGVuYWJsZWQsIGNoZWNrIHRvIHNlZSBpZiB0aGVyZSBpcyBhIGBuZXh0YCBvciBgcHJldmAgc2libGluZywgaWYgbm90LCBzZWxlY3QgdGhlIGZpcnN0IG9yIGxhc3Qgc2xpZGUgdG8gZmlsbCBpbi4gaWYgd3JhcHBpbmcgbm90IGVuYWJsZWQsIGF0dGVtcHQgdG8gc2VsZWN0IGBuZXh0YCBvciBgcHJldmAsIGlmIHRoZXJlJ3Mgbm90aGluZyB0aGVyZSwgdGhlIGZ1bmN0aW9uIHdpbGwga2ljayBvdXQgb24gbmV4dCBzdGVwLiBDUkFaWSBORVNURUQgVEVSTkFSSUVTISEhISFcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRmaXJzdFNsaWRlIDogJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKS8vcGljayBuZXh0IHNsaWRlIGlmIG1vdmluZyBsZWZ0IHRvIHJpZ2h0XG4gICAgICA6XG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkbGFzdFNsaWRlIDogJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKTsvL3BpY2sgcHJldiBzbGlkZSBpZiBtb3ZpbmcgcmlnaHQgdG8gbGVmdFxuICAgIH0gZWxzZSB7XG4gICAgICAkbmV3U2xpZGUgPSBjaG9zZW5TbGlkZTtcbiAgICB9XG5cbiAgICBpZiAoJG5ld1NsaWRlLmxlbmd0aCkge1xuICAgICAgLyoqXG4gICAgICAqIFRyaWdnZXJzIGJlZm9yZSB0aGUgbmV4dCBzbGlkZSBzdGFydHMgYW5pbWF0aW5nIGluIGFuZCBvbmx5IGlmIGEgbmV4dCBzbGlkZSBoYXMgYmVlbiBmb3VuZC5cbiAgICAgICogQGV2ZW50IE9yYml0I2JlZm9yZXNsaWRlY2hhbmdlXG4gICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdiZWZvcmVzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFskY3VyU2xpZGUsICRuZXdTbGlkZV0pO1xuICAgICAgXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgaWR4ID0gaWR4IHx8IHRoaXMuJHNsaWRlcy5pbmRleCgkbmV3U2xpZGUpOyAvL2dyYWIgaW5kZXggdG8gdXBkYXRlIGJ1bGxldHNcbiAgICAgICAgdGhpcy5fdXBkYXRlQnVsbGV0cyhpZHgpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnVzZU1VSSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4oXG4gICAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5jc3Moeydwb3NpdGlvbic6ICdhYnNvbHV0ZScsICd0b3AnOiAwfSksXG4gICAgICAgICAgdGhpcy5vcHRpb25zW2BhbmltSW5Gcm9tJHtkaXJJbn1gXSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgJG5ld1NsaWRlLmNzcyh7J3Bvc2l0aW9uJzogJ3JlbGF0aXZlJywgJ2Rpc3BsYXknOiAnYmxvY2snfSlcbiAgICAgICAgICAgIC5hdHRyKCdhcmlhLWxpdmUnLCAncG9saXRlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQoXG4gICAgICAgICAgJGN1clNsaWRlLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1PdXRUbyR7ZGlyT3V0fWBdLFxuICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQXR0cignYXJpYS1saXZlJyk7XG4gICAgICAgICAgICBpZihfdGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICFfdGhpcy50aW1lci5pc1BhdXNlZCl7XG4gICAgICAgICAgICAgIF90aGlzLnRpbWVyLnJlc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vZG8gc3R1ZmY/XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLnJlbW92ZUF0dHIoJ2FyaWEtbGl2ZScpLmhpZGUoKTtcbiAgICAgICAgJG5ld1NsaWRlLmFkZENsYXNzKCdpcy1hY3RpdmUgaXMtaW4nKS5hdHRyKCdhcmlhLWxpdmUnLCAncG9saXRlJykuc2hvdygpO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5ICYmICF0aGlzLnRpbWVyLmlzUGF1c2VkKSB7XG4gICAgICAgICAgdGhpcy50aW1lci5yZXN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAvKipcbiAgICAqIFRyaWdnZXJzIHdoZW4gdGhlIHNsaWRlIGhhcyBmaW5pc2hlZCBhbmltYXRpbmcgaW4uXG4gICAgKiBAZXZlbnQgT3JiaXQjc2xpZGVjaGFuZ2VcbiAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFskbmV3U2xpZGVdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBVcGRhdGVzIHRoZSBhY3RpdmUgc3RhdGUgb2YgdGhlIGJ1bGxldHMsIGlmIGRpc3BsYXllZC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSB0aGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgc2xpZGUuXG4gICovXG4gIF91cGRhdGVCdWxsZXRzKGlkeCkge1xuICAgIHZhciAkb2xkQnVsbGV0ID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMuYm94T2ZCdWxsZXRzfWApXG4gICAgLmZpbmQoJy5pcy1hY3RpdmUnKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJykuYmx1cigpLFxuICAgIHNwYW4gPSAkb2xkQnVsbGV0LmZpbmQoJ3NwYW46bGFzdCcpLmRldGFjaCgpLFxuICAgICRuZXdCdWxsZXQgPSB0aGlzLiRidWxsZXRzLmVxKGlkeCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmFwcGVuZChzcGFuKTtcbiAgfVxuXG4gIC8qKlxuICAqIERlc3Ryb3lzIHRoZSBjYXJvdXNlbCBhbmQgaGlkZXMgdGhlIGVsZW1lbnQuXG4gICogQGZ1bmN0aW9uXG4gICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5vcmJpdCcpLmZpbmQoJyonKS5vZmYoJy56Zi5vcmJpdCcpLmVuZCgpLmhpZGUoKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuT3JiaXQuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAqIFRlbGxzIHRoZSBKUyB0byBsb29rIGZvciBhbmQgbG9hZEJ1bGxldHMuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgYnVsbGV0czogdHJ1ZSxcbiAgLyoqXG4gICogVGVsbHMgdGhlIEpTIHRvIGFwcGx5IGV2ZW50IGxpc3RlbmVycyB0byBuYXYgYnV0dG9uc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIG5hdkJ1dHRvbnM6IHRydWUsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLWluLXJpZ2h0J1xuICAqL1xuICBhbmltSW5Gcm9tUmlnaHQ6ICdzbGlkZS1pbi1yaWdodCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLW91dC1yaWdodCdcbiAgKi9cbiAgYW5pbU91dFRvUmlnaHQ6ICdzbGlkZS1vdXQtcmlnaHQnLFxuICAvKipcbiAgKiBtb3Rpb24tdWkgYW5pbWF0aW9uIGNsYXNzIHRvIGFwcGx5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdzbGlkZS1pbi1sZWZ0J1xuICAqXG4gICovXG4gIGFuaW1JbkZyb21MZWZ0OiAnc2xpZGUtaW4tbGVmdCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLW91dC1sZWZ0J1xuICAqL1xuICBhbmltT3V0VG9MZWZ0OiAnc2xpZGUtb3V0LWxlZnQnLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gYXV0b21hdGljYWxseSBhbmltYXRlIG9uIHBhZ2UgbG9hZC5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBhdXRvUGxheTogdHJ1ZSxcbiAgLyoqXG4gICogQW1vdW50IG9mIHRpbWUsIGluIG1zLCBiZXR3ZWVuIHNsaWRlIHRyYW5zaXRpb25zXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIDUwMDBcbiAgKi9cbiAgdGltZXJEZWxheTogNTAwMCxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGluZmluaXRlbHkgbG9vcCB0aHJvdWdoIHRoZSBzbGlkZXNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBpbmZpbml0ZVdyYXA6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyB0aGUgT3JiaXQgc2xpZGVzIHRvIGJpbmQgdG8gc3dpcGUgZXZlbnRzIGZvciBtb2JpbGUsIHJlcXVpcmVzIGFuIGFkZGl0aW9uYWwgdXRpbCBsaWJyYXJ5XG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgc3dpcGU6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyB0aGUgdGltaW5nIGZ1bmN0aW9uIHRvIHBhdXNlIGFuaW1hdGlvbiBvbiBob3Zlci5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBwYXVzZU9uSG92ZXI6IHRydWUsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBiaW5kIGtleWJvYXJkIGV2ZW50cyB0byB0aGUgc2xpZGVyLCB0byBhbmltYXRlIGZyYW1lcyB3aXRoIGFycm93IGtleXNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBhY2Nlc3NpYmxlOiB0cnVlLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBjb250YWluZXIgb2YgT3JiaXRcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LWNvbnRhaW5lcidcbiAgKi9cbiAgY29udGFpbmVyQ2xhc3M6ICdvcmJpdC1jb250YWluZXInLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIGluZGl2aWR1YWwgc2xpZGVzLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtc2xpZGUnXG4gICovXG4gIHNsaWRlQ2xhc3M6ICdvcmJpdC1zbGlkZScsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGJ1bGxldCBjb250YWluZXIuIFlvdSdyZSB3ZWxjb21lLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtYnVsbGV0cydcbiAgKi9cbiAgYm94T2ZCdWxsZXRzOiAnb3JiaXQtYnVsbGV0cycsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGBuZXh0YCBuYXZpZ2F0aW9uIGJ1dHRvbi5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ29yYml0LW5leHQnXG4gICovXG4gIG5leHRDbGFzczogJ29yYml0LW5leHQnLFxuICAvKipcbiAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBgcHJldmlvdXNgIG5hdmlnYXRpb24gYnV0dG9uLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtcHJldmlvdXMnXG4gICovXG4gIHByZXZDbGFzczogJ29yYml0LXByZXZpb3VzJyxcbiAgLyoqXG4gICogQm9vbGVhbiB0byBmbGFnIHRoZSBqcyB0byB1c2UgbW90aW9uIHVpIGNsYXNzZXMgb3Igbm90LiBEZWZhdWx0IHRvIHRydWUgZm9yIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5LlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHVzZU1VSTogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKE9yYml0LCAnT3JiaXQnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVNZW51IG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuZHJpbGxkb3duXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmRyb3Bkb3duLW1lbnVcbiAqL1xuXG5jbGFzcyBSZXNwb25zaXZlTWVudSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgcmVzcG9uc2l2ZSBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVNZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICB0aGlzLnJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLW1lbnUnKTtcbiAgICB0aGlzLmN1cnJlbnRNcSA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbnVsbDtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVNZW51Jyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIE1lbnUgYnkgcGFyc2luZyB0aGUgY2xhc3NlcyBmcm9tIHRoZSAnZGF0YS1SZXNwb25zaXZlTWVudScgYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIC8vIFRoZSBmaXJzdCB0aW1lIGFuIEludGVyY2hhbmdlIHBsdWdpbiBpcyBpbml0aWFsaXplZCwgdGhpcy5ydWxlcyBpcyBjb252ZXJ0ZWQgZnJvbSBhIHN0cmluZyBvZiBcImNsYXNzZXNcIiB0byBhbiBvYmplY3Qgb2YgcnVsZXNcbiAgICBpZiAodHlwZW9mIHRoaXMucnVsZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgcnVsZXNUcmVlID0ge307XG5cbiAgICAgIC8vIFBhcnNlIHJ1bGVzIGZyb20gXCJjbGFzc2VzXCIgcHVsbGVkIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgIGxldCBydWxlcyA9IHRoaXMucnVsZXMuc3BsaXQoJyAnKTtcblxuICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGV2ZXJ5IHJ1bGUgZm91bmRcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHJ1bGUgPSBydWxlc1tpXS5zcGxpdCgnLScpO1xuICAgICAgICBsZXQgcnVsZVNpemUgPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzBdIDogJ3NtYWxsJztcbiAgICAgICAgbGV0IHJ1bGVQbHVnaW4gPSBydWxlLmxlbmd0aCA+IDEgPyBydWxlWzFdIDogcnVsZVswXTtcblxuICAgICAgICBpZiAoTWVudVBsdWdpbnNbcnVsZVBsdWdpbl0gIT09IG51bGwpIHtcbiAgICAgICAgICBydWxlc1RyZWVbcnVsZVNpemVdID0gTWVudVBsdWdpbnNbcnVsZVBsdWdpbl07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ydWxlcyA9IHJ1bGVzVHJlZTtcbiAgICB9XG5cbiAgICBpZiAoISQuaXNFbXB0eU9iamVjdCh0aGlzLnJ1bGVzKSkge1xuICAgICAgdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciB0aGUgTWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgfSk7XG4gICAgLy8gJCh3aW5kb3cpLm9uKCdyZXNpemUuemYuUmVzcG9uc2l2ZU1lbnUnLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgIF90aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIC8vIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBzY3JlZW4gd2lkdGggYWdhaW5zdCBhdmFpbGFibGUgbWVkaWEgcXVlcmllcy4gSWYgdGhlIG1lZGlhIHF1ZXJ5IGhhcyBjaGFuZ2VkLCBhbmQgdGhlIHBsdWdpbiBuZWVkZWQgaGFzIGNoYW5nZWQsIHRoZSBwbHVnaW5zIHdpbGwgc3dhcCBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrTWVkaWFRdWVyaWVzKCkge1xuICAgIHZhciBtYXRjaGVkTXEsIF90aGlzID0gdGhpcztcbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBydWxlIGFuZCBmaW5kIHRoZSBsYXN0IG1hdGNoaW5nIHJ1bGVcbiAgICAkLmVhY2godGhpcy5ydWxlcywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3Qoa2V5KSkge1xuICAgICAgICBtYXRjaGVkTXEgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBObyBtYXRjaD8gTm8gZGljZVxuICAgIGlmICghbWF0Y2hlZE1xKSByZXR1cm47XG5cbiAgICAvLyBQbHVnaW4gYWxyZWFkeSBpbml0aWFsaXplZD8gV2UgZ29vZFxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4gaW5zdGFuY2VvZiB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKSByZXR1cm47XG5cbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcGx1Z2luLXNwZWNpZmljIENTUyBjbGFzc2VzXG4gICAgJC5lYWNoKE1lbnVQbHVnaW5zLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyh2YWx1ZS5jc3NDbGFzcyk7XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgdGhlIENTUyBjbGFzcyBmb3IgdGhlIG5ldyBwbHVnaW5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5jc3NDbGFzcyk7XG5cbiAgICAvLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgdGhlIG5ldyBwbHVnaW5cbiAgICBpZiAodGhpcy5jdXJyZW50UGx1Z2luKSB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgIHRoaXMuY3VycmVudFBsdWdpbiA9IG5ldyB0aGlzLnJ1bGVzW21hdGNoZWRNcV0ucGx1Z2luKHRoaXMuJGVsZW1lbnQsIHt9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgdGhlIGN1cnJlbnQgcGx1Z2luIG9uIHRoaXMgZWxlbWVudCwgYXMgd2VsbCBhcyB0aGUgd2luZG93IHJlc2l6ZSBoYW5kbGVyIHRoYXQgc3dpdGNoZXMgdGhlIHBsdWdpbnMgb3V0LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luLmRlc3Ryb3koKTtcbiAgICAkKHdpbmRvdykub2ZmKCcuemYuUmVzcG9uc2l2ZU1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZU1lbnUuZGVmYXVsdHMgPSB7fTtcblxuLy8gVGhlIHBsdWdpbiBtYXRjaGVzIHRoZSBwbHVnaW4gY2xhc3NlcyB3aXRoIHRoZXNlIHBsdWdpbiBpbnN0YW5jZXMuXG52YXIgTWVudVBsdWdpbnMgPSB7XG4gIGRyb3Bkb3duOiB7XG4gICAgY3NzQ2xhc3M6ICdkcm9wZG93bicsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydkcm9wZG93bi1tZW51J10gfHwgbnVsbFxuICB9LFxuIGRyaWxsZG93bjoge1xuICAgIGNzc0NsYXNzOiAnZHJpbGxkb3duJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2RyaWxsZG93biddIHx8IG51bGxcbiAgfSxcbiAgYWNjb3JkaW9uOiB7XG4gICAgY3NzQ2xhc3M6ICdhY2NvcmRpb24tbWVudScsXG4gICAgcGx1Z2luOiBGb3VuZGF0aW9uLl9wbHVnaW5zWydhY2NvcmRpb24tbWVudSddIHx8IG51bGxcbiAgfVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVNZW51LCAnUmVzcG9uc2l2ZU1lbnUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJlc3BvbnNpdmVUb2dnbGUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVUb2dnbGVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICovXG5cbmNsYXNzIFJlc3BvbnNpdmVUb2dnbGUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUYWIgQmFyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFJlc3BvbnNpdmVUb2dnbGUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYXR0YWNoIHRhYiBiYXIgZnVuY3Rpb25hbGl0eSB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG4gICAgdGhpcy5fZXZlbnRzKCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXNwb25zaXZlVG9nZ2xlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRhYiBiYXIgYnkgZmluZGluZyB0aGUgdGFyZ2V0IGVsZW1lbnQsIHRvZ2dsaW5nIGVsZW1lbnQsIGFuZCBydW5uaW5nIHVwZGF0ZSgpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciB0YXJnZXRJRCA9IHRoaXMuJGVsZW1lbnQuZGF0YSgncmVzcG9uc2l2ZS10b2dnbGUnKTtcbiAgICBpZiAoIXRhcmdldElEKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdZb3VyIHRhYiBiYXIgbmVlZHMgYW4gSUQgb2YgYSBNZW51IGFzIHRoZSB2YWx1ZSBvZiBkYXRhLXRhYi1iYXIuJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdGFyZ2V0TWVudSA9ICQoYCMke3RhcmdldElEfWApO1xuICAgIHRoaXMuJHRvZ2dsZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXRvZ2dsZV0nKTtcblxuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgdGFiIGJhciB0byB3b3JrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuX3VwZGF0ZU1xSGFuZGxlciA9IHRoaXMuX3VwZGF0ZS5iaW5kKHRoaXMpO1xuICAgIFxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fdXBkYXRlTXFIYW5kbGVyKTtcblxuICAgIHRoaXMuJHRvZ2dsZXIub24oJ2NsaWNrLnpmLnJlc3BvbnNpdmVUb2dnbGUnLCB0aGlzLnRvZ2dsZU1lbnUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5IHRvIGRldGVybWluZSBpZiB0aGUgdGFiIGJhciBzaG91bGQgYmUgdmlzaWJsZSBvciBoaWRkZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZSgpIHtcbiAgICAvLyBNb2JpbGVcbiAgICBpZiAoIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5oaWRlRm9yKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5zaG93KCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LmhpZGUoKTtcbiAgICB9XG5cbiAgICAvLyBEZXNrdG9wXG4gICAgZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUoKTtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUuc2hvdygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBlbGVtZW50IGF0dGFjaGVkIHRvIHRoZSB0YWIgYmFyLiBUaGUgdG9nZ2xlIG9ubHkgaGFwcGVucyBpZiB0aGUgc2NyZWVuIGlzIHNtYWxsIGVub3VnaCB0byBhbGxvdyBpdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICovXG4gIHRvZ2dsZU1lbnUoKSB7ICAgXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIHRoaXMuJHRhcmdldE1lbnUudG9nZ2xlKDApO1xuXG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIgdG9nZ2xlcy5cbiAgICAgICAqIEBldmVudCBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICB9XG4gIH07XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICB0aGlzLiR0b2dnbGVyLm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICBcbiAgICAkKHdpbmRvdykub2ZmKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl91cGRhdGVNcUhhbmRsZXIpO1xuICAgIFxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5SZXNwb25zaXZlVG9nZ2xlLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGhlIGJyZWFrcG9pbnQgYWZ0ZXIgd2hpY2ggdGhlIG1lbnUgaXMgYWx3YXlzIHNob3duLCBhbmQgdGhlIHRhYiBiYXIgaXMgaGlkZGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBoaWRlRm9yOiAnbWVkaXVtJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFJlc3BvbnNpdmVUb2dnbGUsICdSZXNwb25zaXZlVG9nZ2xlJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBSZXZlYWwgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJldmVhbFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb24gaWYgdXNpbmcgYW5pbWF0aW9uc1xuICovXG5cbmNsYXNzIFJldmVhbCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFJldmVhbC5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgZm9yIHRoZSBtb2RhbC5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBSZXZlYWwuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdSZXZlYWwnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdSZXZlYWwnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJyxcbiAgICAgICdUQUInOiAndGFiX2ZvcndhcmQnLFxuICAgICAgJ1NISUZUX1RBQic6ICd0YWJfYmFja3dhcmQnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZGFsIGJ5IGFkZGluZyB0aGUgb3ZlcmxheSBhbmQgY2xvc2UgYnV0dG9ucywgKGlmIHNlbGVjdGVkKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2FjaGVkID0ge21xOiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuY3VycmVudH07XG4gICAgdGhpcy5pc01vYmlsZSA9IG1vYmlsZVNuaWZmKCk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApLmxlbmd0aCA/ICQoYFtkYXRhLW9wZW49XCIke3RoaXMuaWR9XCJdYCkgOiAkKGBbZGF0YS10b2dnbGU9XCIke3RoaXMuaWR9XCJdYCk7XG4gICAgdGhpcy4kYW5jaG9yLmF0dHIoe1xuICAgICAgJ2FyaWEtY29udHJvbHMnOiB0aGlzLmlkLFxuICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgJ3RhYmluZGV4JzogMFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuIHx8IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2Z1bGwnKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmZ1bGxTY3JlZW4gPSB0cnVlO1xuICAgICAgdGhpcy5vcHRpb25zLm92ZXJsYXkgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5ICYmICF0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5ID0gdGhpcy5fbWFrZU92ZXJsYXkodGhpcy5pZCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICAgJ3JvbGUnOiAnZGlhbG9nJyxcbiAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgJ2RhdGEteWV0aS1ib3gnOiB0aGlzLmlkLFxuICAgICAgICAnZGF0YS1yZXNpemUnOiB0aGlzLmlkXG4gICAgfSk7XG5cbiAgICBpZih0aGlzLiRvdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKHRoaXMuJG92ZXJsYXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmRldGFjaCgpLmFwcGVuZFRvKCQoJ2JvZHknKSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKCd3aXRob3V0LW92ZXJsYXknKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluayAmJiB3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCBgIyR7dGhpcy5pZH1gKSkge1xuICAgICAgJCh3aW5kb3cpLm9uZSgnbG9hZC56Zi5yZXZlYWwnLCB0aGlzLm9wZW4uYmluZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gb3ZlcmxheSBkaXYgdG8gZGlzcGxheSBiZWhpbmQgdGhlIG1vZGFsLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX21ha2VPdmVybGF5KGlkKSB7XG4gICAgdmFyICRvdmVybGF5ID0gJCgnPGRpdj48L2Rpdj4nKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3JldmVhbC1vdmVybGF5JylcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZFRvKCdib2R5Jyk7XG4gICAgcmV0dXJuICRvdmVybGF5O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgcG9zaXRpb24gb2YgbW9kYWxcbiAgICogVE9ETzogIEZpZ3VyZSBvdXQgaWYgd2UgYWN0dWFsbHkgbmVlZCB0byBjYWNoZSB0aGVzZSB2YWx1ZXMgb3IgaWYgaXQgZG9lc24ndCBtYXR0ZXJcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGVQb3NpdGlvbigpIHtcbiAgICB2YXIgd2lkdGggPSB0aGlzLiRlbGVtZW50Lm91dGVyV2lkdGgoKTtcbiAgICB2YXIgb3V0ZXJXaWR0aCA9ICQod2luZG93KS53aWR0aCgpO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLiRlbGVtZW50Lm91dGVySGVpZ2h0KCk7XG4gICAgdmFyIG91dGVySGVpZ2h0ID0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIHZhciBsZWZ0LCB0b3A7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5oT2Zmc2V0ID09PSAnYXV0bycpIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCgob3V0ZXJXaWR0aCAtIHdpZHRoKSAvIDIsIDEwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy5oT2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudk9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBpZiAoaGVpZ2h0ID4gb3V0ZXJIZWlnaHQpIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoTWF0aC5taW4oMTAwLCBvdXRlckhlaWdodCAvIDEwKSwgMTApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9wID0gcGFyc2VJbnQoKG91dGVySGVpZ2h0IC0gaGVpZ2h0KSAvIDQsIDEwKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdG9wID0gcGFyc2VJbnQodGhpcy5vcHRpb25zLnZPZmZzZXQsIDEwKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe3RvcDogdG9wICsgJ3B4J30pO1xuICAgIC8vIG9ubHkgd29ycnkgYWJvdXQgbGVmdCBpZiB3ZSBkb24ndCBoYXZlIGFuIG92ZXJsYXkgb3Igd2UgaGF2ZWEgIGhvcml6b250YWwgb2Zmc2V0LFxuICAgIC8vIG90aGVyd2lzZSB3ZSdyZSBwZXJmZWN0bHkgaW4gdGhlIG1pZGRsZVxuICAgIGlmKCF0aGlzLiRvdmVybGF5IHx8ICh0aGlzLm9wdGlvbnMuaE9mZnNldCAhPT0gJ2F1dG8nKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe2xlZnQ6IGxlZnQgKyAncHgnfSk7XG4gICAgICB0aGlzLiRlbGVtZW50LmNzcyh7bWFyZ2luOiAnMHB4J30pO1xuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiAoZXZlbnQsICRlbGVtZW50KSA9PiB7XG4gICAgICAgIGlmICgoZXZlbnQudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSkgfHxcbiAgICAgICAgICAgICgkKGV2ZW50LnRhcmdldCkucGFyZW50cygnW2RhdGEtY2xvc2FibGVdJylbMF0gPT09ICRlbGVtZW50KSkgeyAvLyBvbmx5IGNsb3NlIHJldmVhbCB3aGVuIGl0J3MgZXhwbGljaXRseSBjYWxsZWRcbiAgICAgICAgICByZXR1cm4gdGhpcy5jbG9zZS5hcHBseSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgICd0b2dnbGUuemYudHJpZ2dlcic6IHRoaXMudG9nZ2xlLmJpbmQodGhpcyksXG4gICAgICAncmVzaXplbWUuemYudHJpZ2dlcic6IGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLiRhbmNob3Iub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMgfHwgZS53aGljaCA9PT0gMzIpIHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmIHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRvdmVybGF5Lm9mZignLnpmLnJldmVhbCcpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgXG4gICAgICAgICAgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpIHx8IFxuICAgICAgICAgICAgISQuY29udGFpbnMoZG9jdW1lbnQsIGUudGFyZ2V0KSkgeyBcbiAgICAgICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgfVxuICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICQod2luZG93KS5vbihgcG9wc3RhdGUuemYucmV2ZWFsOiR7dGhpcy5pZH1gLCB0aGlzLl9oYW5kbGVTdGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBtb2RhbCBtZXRob2RzIG9uIGJhY2svZm9yd2FyZCBidXR0b24gY2xpY2tzIG9yIGFueSBvdGhlciBldmVudCB0aGF0IHRyaWdnZXJzIHBvcHN0YXRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hhbmRsZVN0YXRlKGUpIHtcbiAgICBpZih3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCAnIycgKyB0aGlzLmlkKSAmJiAhdGhpcy5pc0FjdGl2ZSl7IHRoaXMub3BlbigpOyB9XG4gICAgZWxzZXsgdGhpcy5jbG9zZSgpOyB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgbW9kYWwgY29udHJvbGxlZCBieSBgdGhpcy4kYW5jaG9yYCwgYW5kIGNsb3NlcyBhbGwgb3RoZXJzIGJ5IGRlZmF1bHQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmV2ZWFsI2Nsb3NlbWVcbiAgICogQGZpcmVzIFJldmVhbCNvcGVuXG4gICAqL1xuICBvcGVuKCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgIHZhciBoYXNoID0gYCMke3RoaXMuaWR9YDtcblxuICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSkge1xuICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBNYWtlIGVsZW1lbnRzIGludmlzaWJsZSwgYnV0IHJlbW92ZSBkaXNwbGF5OiBub25lIHNvIHdlIGNhbiBnZXQgc2l6ZSBhbmQgcG9zaXRpb25pbmdcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICdoaWRkZW4nIH0pXG4gICAgICAgIC5zaG93KClcbiAgICAgICAgLnNjcm9sbFRvcCgwKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICdoaWRkZW4nfSkuc2hvdygpO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuaGlkZSgpXG4gICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnJyB9KTtcblxuICAgIGlmKHRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICcnfSkuaGlkZSgpO1xuICAgICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnZmFzdCcpKSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2Zhc3QnKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnc2xvdycpKSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ3Nsb3cnKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpcGxlT3BlbmVkKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgbW9kYWwgb3BlbnMuXG4gICAgICAgKiBDbG9zZXMgYW55IG90aGVyIG1vZGFscyB0aGF0IGFyZSBjdXJyZW50bHkgb3BlblxuICAgICAgICogQGV2ZW50IFJldmVhbCNjbG9zZW1lXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi5yZXZlYWwnLCB0aGlzLmlkKTtcbiAgICB9XG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiByZXZlYWxcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkluKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgZnVuY3Rpb24gYWZ0ZXJBbmltYXRpb25Gb2N1cygpe1xuICAgICAgICBfdGhpcy4kZWxlbWVudFxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxuICAgICAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5mb2N1cygpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRvdmVybGF5LCAnZmFkZS1pbicpO1xuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25JbiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuICAgICAgICBhZnRlckFuaW1hdGlvbkZvY3VzKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiByZXZlYWxcbiAgICBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LnNob3coMCk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LnNob3codGhpcy5vcHRpb25zLnNob3dEZWxheSk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGFjY2Vzc2liaWxpdHlcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuYXR0cih7XG4gICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxuICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgfSlcbiAgICAgIC5mb2N1cygpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaGFzIHN1Y2Nlc3NmdWxseSBvcGVuZWQuXG4gICAgICogQGV2ZW50IFJldmVhbCNvcGVuXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvcGVuLnpmLnJldmVhbCcpO1xuXG4gICAgaWYgKHRoaXMuaXNNb2JpbGUpIHtcbiAgICAgIHRoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAkKCdodG1sLCBib2R5JykuYWRkQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgIH1cblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fZXh0cmFIYW5kbGVycygpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXh0cmEgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBib2R5IGFuZCB3aW5kb3cgaWYgbmVjZXNzYXJ5LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V4dHJhSGFuZGxlcnMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiB0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmICF0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbikge1xuICAgICAgJCgnYm9keScpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHwgXG4gICAgICAgICAgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpIHx8IFxuICAgICAgICAgICAgISQuY29udGFpbnMoZG9jdW1lbnQsIGUudGFyZ2V0KSkgeyByZXR1cm47IH1cbiAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5jbG9zZU9uRXNjKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gbG9jayBmb2N1cyB3aXRoaW4gbW9kYWwgd2hpbGUgdGFiYmluZ1xuICAgIHRoaXMuJGVsZW1lbnQub24oJ2tleWRvd24uemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1JldmVhbCcsIHtcbiAgICAgICAgdGFiX2ZvcndhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoLTEpKSkgeyAvLyBsZWZ0IG1vZGFsIGRvd253YXJkcywgc2V0dGluZyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgICBfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgwKS5mb2N1cygpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5sZW5ndGggPT09IDApIHsgLy8gbm8gZm9jdXNhYmxlIGVsZW1lbnRzIGluc2lkZSB0aGUgbW9kYWwgYXQgYWxsLCBwcmV2ZW50IHRhYmJpbmcgaW4gZ2VuZXJhbFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJfYmFja3dhcmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZmluZCgnOmZvY3VzJykuaXMoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMuZXEoMCkpIHx8IF90aGlzLiRlbGVtZW50LmlzKCc6Zm9jdXMnKSkgeyAvLyBsZWZ0IG1vZGFsIHVwd2FyZHMsIHNldHRpbmcgZm9jdXMgdG8gbGFzdCBlbGVtZW50XG4gICAgICAgICAgICBfdGhpcy5mb2N1c2FibGVFbGVtZW50cy5lcSgtMSkuZm9jdXMoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoX3RoaXMuZm9jdXNhYmxlRWxlbWVudHMubGVuZ3RoID09PSAwKSB7IC8vIG5vIGZvY3VzYWJsZSBlbGVtZW50cyBpbnNpZGUgdGhlIG1vZGFsIGF0IGFsbCwgcHJldmVudCB0YWJiaW5nIGluIGdlbmVyYWxcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLiRlbGVtZW50LmZpbmQoJzpmb2N1cycpLmlzKF90aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpKSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgLy8gc2V0IGZvY3VzIGJhY2sgdG8gYW5jaG9yIGlmIGNsb3NlIGJ1dHRvbiBoYXMgYmVlbiBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkdGFyZ2V0LmlzKF90aGlzLmZvY3VzYWJsZUVsZW1lbnRzKSkgeyAvLyBkb250J3QgdHJpZ2dlciBpZiBhY3VhbCBlbGVtZW50IGhhcyBmb2N1cyAoaS5lLiBpbnB1dHMsIGxpbmtzLCAuLi4pXG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgaWYgKHByZXZlbnREZWZhdWx0KSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFJldmVhbCNjbG9zZWRcbiAgICovXG4gIGNsb3NlKCkge1xuICAgIGlmICghdGhpcy5pc0FjdGl2ZSB8fCAhdGhpcy4kZWxlbWVudC5pcygnOnZpc2libGUnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiBoaWRpbmdcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kb3ZlcmxheSwgJ2ZhZGUtb3V0JywgZmluaXNoVXApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGZpbmlzaFVwKCk7XG4gICAgICB9XG5cbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbk91dCk7XG4gICAgfVxuICAgIC8vIGpRdWVyeSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgdGhpcy4kb3ZlcmxheS5oaWRlKDAsIGZpbmlzaFVwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmaW5pc2hVcCgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLiRlbGVtZW50LmhpZGUodGhpcy5vcHRpb25zLmhpZGVEZWxheSk7XG4gICAgfVxuXG4gICAgLy8gQ29uZGl0aW9uYWxzIHRvIHJlbW92ZSBleHRyYSBldmVudCBsaXN0ZW5lcnMgYWRkZWQgb24gb3BlblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgJCh3aW5kb3cpLm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5vdmVybGF5ICYmIHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2spIHtcbiAgICAgICQoJ2JvZHknKS5vZmYoJ2NsaWNrLnpmLnJldmVhbCcpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdrZXlkb3duLnpmLnJldmVhbCcpO1xuXG4gICAgZnVuY3Rpb24gZmluaXNoVXAoKSB7XG4gICAgICBpZiAoX3RoaXMuaXNNb2JpbGUpIHtcbiAgICAgICAgJCgnaHRtbCwgYm9keScpLnJlbW92ZUNsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgICBpZihfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcykge1xuICAgICAgICAgICQoJ2JvZHknKS5zY3JvbGxUb3AoX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpO1xuICAgICAgICAgIF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgIH1cblxuICAgICAgX3RoaXMuJGVsZW1lbnQuYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICAgLyoqXG4gICAgICAqIEZpcmVzIHdoZW4gdGhlIG1vZGFsIGlzIGRvbmUgY2xvc2luZy5cbiAgICAgICogQGV2ZW50IFJldmVhbCNjbG9zZWRcbiAgICAgICovXG4gICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZWQuemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBSZXNldHMgdGhlIG1vZGFsIGNvbnRlbnRcbiAgICAqIFRoaXMgcHJldmVudHMgYSBydW5uaW5nIHZpZGVvIHRvIGtlZXAgZ29pbmcgaW4gdGhlIGJhY2tncm91bmRcbiAgICAqL1xuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzZXRPbkNsb3NlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lmh0bWwodGhpcy4kZWxlbWVudC5odG1sKCkpO1xuICAgIH1cblxuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgaWYgKF90aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICBpZiAod2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKSB7XG4gICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoXCJcIiwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJyc7XG4gICAgICAgfVxuICAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgb3Blbi9jbG9zZWQgc3RhdGUgb2YgYSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBhIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICB0aGlzLiRlbGVtZW50LmFwcGVuZFRvKCQoJ2JvZHknKSk7IC8vIG1vdmUgJGVsZW1lbnQgb3V0c2lkZSBvZiAkb3ZlcmxheSB0byBwcmV2ZW50IGVycm9yIHVucmVnaXN0ZXJQbHVnaW4oKVxuICAgICAgdGhpcy4kb3ZlcmxheS5oaWRlKCkub2ZmKCkucmVtb3ZlKCk7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQuaGlkZSgpLm9mZigpO1xuICAgIHRoaXMuJGFuY2hvci5vZmYoJy56ZicpO1xuICAgICQod2luZG93KS5vZmYoYC56Zi5yZXZlYWw6JHt0aGlzLmlkfWApO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9O1xufVxuXG5SZXZlYWwuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbGlkZS1pbi1sZWZ0J1xuICAgKi9cbiAgYW5pbWF0aW9uSW46ICcnLFxuICAvKipcbiAgICogTW90aW9uLVVJIGNsYXNzIHRvIHVzZSBmb3IgYW5pbWF0ZWQgZWxlbWVudHMuIElmIG5vbmUgdXNlZCwgZGVmYXVsdHMgdG8gc2ltcGxlIHNob3cvaGlkZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LXJpZ2h0J1xuICAgKi9cbiAgYW5pbWF0aW9uT3V0OiAnJyxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBkZWxheSB0aGUgb3BlbmluZyBvZiBhIG1vZGFsIGFmdGVyIGEgY2xpY2sgaWYgbm8gYW5pbWF0aW9uIHVzZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIHNob3dEZWxheTogMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBkZWxheSB0aGUgY2xvc2luZyBvZiBhIG1vZGFsIGFmdGVyIGEgY2xpY2sgaWYgbm8gYW5pbWF0aW9uIHVzZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIGhpZGVEZWxheTogMCxcbiAgLyoqXG4gICAqIEFsbG93cyBhIGNsaWNrIG9uIHRoZSBib2R5L292ZXJsYXkgdG8gY2xvc2UgdGhlIG1vZGFsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gY2xvc2UgaWYgdGhlIHVzZXIgcHJlc3NlcyB0aGUgYEVTQ0FQRWAga2V5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25Fc2M6IHRydWUsXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBhbGxvd3MgbXVsdGlwbGUgbW9kYWxzIHRvIGJlIGRpc3BsYXllZCBhdCBvbmNlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtdWx0aXBsZU9wZW5lZDogZmFsc2UsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggZG93biBmcm9tIHRoZSB0b3Agb2YgdGhlIHNjcmVlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBhdXRvXG4gICAqL1xuICB2T2Zmc2V0OiAnYXV0bycsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggaW4gZnJvbSB0aGUgc2lkZSBvZiB0aGUgc2NyZWVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGF1dG9cbiAgICovXG4gIGhPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYmUgZnVsbHNjcmVlbiwgY29tcGxldGVseSBibG9ja2luZyBvdXQgdGhlIHJlc3Qgb2YgdGhlIHZpZXcuIEpTIGNoZWNrcyBmb3IgdGhpcyBhcyB3ZWxsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBmdWxsU2NyZWVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBlcmNlbnRhZ2Ugb2Ygc2NyZWVuIGhlaWdodCB0aGUgbW9kYWwgc2hvdWxkIHB1c2ggdXAgZnJvbSB0aGUgYm90dG9tIG9mIHRoZSB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwXG4gICAqL1xuICBidG1PZmZzZXRQY3Q6IDEwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBnZW5lcmF0ZSBhbiBvdmVybGF5IGRpdiwgd2hpY2ggd2lsbCBjb3ZlciB0aGUgdmlldyB3aGVuIG1vZGFsIG9wZW5zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIG92ZXJsYXk6IHRydWUsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIHJlbW92ZSBhbmQgcmVpbmplY3QgbWFya3VwIG9uIGNsb3NlLiBTaG91bGQgYmUgdHJ1ZSBpZiB1c2luZyB2aWRlbyBlbGVtZW50cyB3L28gdXNpbmcgcHJvdmlkZXIncyBhcGksIG90aGVyd2lzZSwgdmlkZW9zIHdpbGwgY29udGludWUgdG8gcGxheSBpbiB0aGUgYmFja2dyb3VuZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgcmVzZXRPbkNsb3NlOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gYWx0ZXIgdGhlIHVybCBvbiBvcGVuL2Nsb3NlLCBhbmQgYWxsb3dzIHRoZSB1c2Ugb2YgdGhlIGBiYWNrYCBidXR0b24gdG8gY2xvc2UgbW9kYWxzLiBBTFNPLCBhbGxvd3MgYSBtb2RhbCB0byBhdXRvLW1hbmlhY2FsbHkgb3BlbiBvbiBwYWdlIGxvYWQgSUYgdGhlIGhhc2ggPT09IHRoZSBtb2RhbCdzIHVzZXItc2V0IGlkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkZWVwTGluazogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXZlYWwsICdSZXZlYWwnKTtcblxuZnVuY3Rpb24gaVBob25lU25pZmYoKSB7XG4gIHJldHVybiAvaVAoYWR8aG9uZXxvZCkuKk9TLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcbn1cblxuZnVuY3Rpb24gYW5kcm9pZFNuaWZmKCkge1xuICByZXR1cm4gL0FuZHJvaWQvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBtb2JpbGVTbmlmZigpIHtcbiAgcmV0dXJuIGlQaG9uZVNuaWZmKCkgfHwgYW5kcm9pZFNuaWZmKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBTbGlkZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnNsaWRlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudG91Y2hcbiAqL1xuXG5jbGFzcyBTbGlkZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIGRyaWxsZG93biBtZW51LlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBhY2NvcmRpb24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTbGlkZXIuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1NsaWRlcicpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1NsaWRlcicsIHtcbiAgICAgICdsdHInOiB7XG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19VUCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19ET1dOJzogJ2RlY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnZGVjcmVhc2UnLFxuICAgICAgICAnU0hJRlRfQVJST1dfUklHSFQnOiAnaW5jcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19VUCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0RPV04nOiAnZGVjcmVhc2VfZmFzdCcsXG4gICAgICAgICdTSElGVF9BUlJPV19MRUZUJzogJ2RlY3JlYXNlX2Zhc3QnXG4gICAgICB9LFxuICAgICAgJ3J0bCc6IHtcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnaW5jcmVhc2UnLFxuICAgICAgICAnQVJST1dfUklHSFQnOiAnZGVjcmVhc2UnLFxuICAgICAgICAnU0hJRlRfQVJST1dfTEVGVCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1JJR0hUJzogJ2RlY3JlYXNlX2Zhc3QnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlsaXplcyB0aGUgcGx1Z2luIGJ5IHJlYWRpbmcvc2V0dGluZyBhdHRyaWJ1dGVzLCBjcmVhdGluZyBjb2xsZWN0aW9ucyBhbmQgc2V0dGluZyB0aGUgaW5pdGlhbCBwb3NpdGlvbiBvZiB0aGUgaGFuZGxlKHMpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuaW5wdXRzID0gdGhpcy4kZWxlbWVudC5maW5kKCdpbnB1dCcpO1xuICAgIHRoaXMuaGFuZGxlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtc2xpZGVyLWhhbmRsZV0nKTtcblxuICAgIHRoaXMuJGhhbmRsZSA9IHRoaXMuaGFuZGxlcy5lcSgwKTtcbiAgICB0aGlzLiRpbnB1dCA9IHRoaXMuaW5wdXRzLmxlbmd0aCA/IHRoaXMuaW5wdXRzLmVxKDApIDogJChgIyR7dGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKTtcbiAgICB0aGlzLiRmaWxsID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zbGlkZXItZmlsbF0nKS5jc3ModGhpcy5vcHRpb25zLnZlcnRpY2FsID8gJ2hlaWdodCcgOiAnd2lkdGgnLCAwKTtcblxuICAgIHZhciBpc0RibCA9IGZhbHNlLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kaXNhYmxlZCB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5kaXNhYmxlZENsYXNzKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5pbnB1dHMgPSAkKCkuYWRkKHRoaXMuJGlucHV0KTtcbiAgICAgIHRoaXMub3B0aW9ucy5iaW5kaW5nID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5fc2V0SW5pdEF0dHIoMCk7XG4gICAgdGhpcy5fZXZlbnRzKHRoaXMuJGhhbmRsZSk7XG5cbiAgICBpZiAodGhpcy5oYW5kbGVzWzFdKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kaGFuZGxlMiA9IHRoaXMuaGFuZGxlcy5lcSgxKTtcbiAgICAgIHRoaXMuJGlucHV0MiA9IHRoaXMuaW5wdXRzLmxlbmd0aCA+IDEgPyB0aGlzLmlucHV0cy5lcSgxKSA6ICQoYCMke3RoaXMuJGhhbmRsZTIuYXR0cignYXJpYS1jb250cm9scycpfWApO1xuXG4gICAgICBpZiAoIXRoaXMuaW5wdXRzWzFdKSB7XG4gICAgICAgIHRoaXMuaW5wdXRzID0gdGhpcy5pbnB1dHMuYWRkKHRoaXMuJGlucHV0Mik7XG4gICAgICB9XG4gICAgICBpc0RibCA9IHRydWU7XG5cbiAgICAgIHRoaXMuX3NldEhhbmRsZVBvcyh0aGlzLiRoYW5kbGUsIHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQsIHRydWUsIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoX3RoaXMuJGhhbmRsZTIsIF90aGlzLm9wdGlvbnMuaW5pdGlhbEVuZCwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIC8vIHRoaXMuJGhhbmRsZS50cmlnZ2VySGFuZGxlcignY2xpY2suemYuc2xpZGVyJyk7XG4gICAgICB0aGlzLl9zZXRJbml0QXR0cigxKTtcbiAgICAgIHRoaXMuX2V2ZW50cyh0aGlzLiRoYW5kbGUyKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRGJsKSB7XG4gICAgICB0aGlzLl9zZXRIYW5kbGVQb3ModGhpcy4kaGFuZGxlLCB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0LCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgcG9zaXRpb24gb2YgdGhlIHNlbGVjdGVkIGhhbmRsZSBhbmQgZmlsbCBiYXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhuZGwgLSB0aGUgc2VsZWN0ZWQgaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsb2NhdGlvbiAtIGZsb2F0aW5nIHBvaW50IGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgdmFsdWVzIG9mIHRoZSBzbGlkZXIgYmFyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgb24gY29tcGxldGlvbi5cbiAgICogQGZpcmVzIFNsaWRlciNtb3ZlZFxuICAgKiBAZmlyZXMgU2xpZGVyI2NoYW5nZWRcbiAgICovXG4gIF9zZXRIYW5kbGVQb3MoJGhuZGwsIGxvY2F0aW9uLCBub0ludmVydCwgY2IpIHtcbiAgICAvLyBkb24ndCBtb3ZlIGlmIHRoZSBzbGlkZXIgaGFzIGJlZW4gZGlzYWJsZWQgc2luY2UgaXRzIGluaXRpYWxpemF0aW9uXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vbWlnaHQgbmVlZCB0byBhbHRlciB0aGF0IHNsaWdodGx5IGZvciBiYXJzIHRoYXQgd2lsbCBoYXZlIG9kZCBudW1iZXIgc2VsZWN0aW9ucy5cbiAgICBsb2NhdGlvbiA9IHBhcnNlRmxvYXQobG9jYXRpb24pOy8vb24gaW5wdXQgY2hhbmdlIGV2ZW50cywgY29udmVydCBzdHJpbmcgdG8gbnVtYmVyLi4uZ3J1bWJsZS5cblxuICAgIC8vIHByZXZlbnQgc2xpZGVyIGZyb20gcnVubmluZyBvdXQgb2YgYm91bmRzLCBpZiB2YWx1ZSBleGNlZWRzIHRoZSBsaW1pdHMgc2V0IHRocm91Z2ggb3B0aW9ucywgb3ZlcnJpZGUgdGhlIHZhbHVlIHRvIG1pbi9tYXhcbiAgICBpZiAobG9jYXRpb24gPCB0aGlzLm9wdGlvbnMuc3RhcnQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuc3RhcnQ7IH1cbiAgICBlbHNlIGlmIChsb2NhdGlvbiA+IHRoaXMub3B0aW9ucy5lbmQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kOyB9XG5cbiAgICB2YXIgaXNEYmwgPSB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQ7XG5cbiAgICBpZiAoaXNEYmwpIHsgLy90aGlzIGJsb2NrIGlzIHRvIHByZXZlbnQgMiBoYW5kbGVzIGZyb20gY3Jvc3NpbmcgZWFjaG90aGVyLiBDb3VsZC9zaG91bGQgYmUgaW1wcm92ZWQuXG4gICAgICBpZiAodGhpcy5oYW5kbGVzLmluZGV4KCRobmRsKSA9PT0gMCkge1xuICAgICAgICB2YXIgaDJWYWwgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZTIuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICAgICAgbG9jYXRpb24gPSBsb2NhdGlvbiA+PSBoMlZhbCA/IGgyVmFsIC0gdGhpcy5vcHRpb25zLnN0ZXAgOiBsb2NhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoMVZhbCA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgICAgIGxvY2F0aW9uID0gbG9jYXRpb24gPD0gaDFWYWwgPyBoMVZhbCArIHRoaXMub3B0aW9ucy5zdGVwIDogbG9jYXRpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy90aGlzIGlzIGZvciBzaW5nbGUtaGFuZGxlZCB2ZXJ0aWNhbCBzbGlkZXJzLCBpdCBhZGp1c3RzIHRoZSB2YWx1ZSB0byBhY2NvdW50IGZvciB0aGUgc2xpZGVyIGJlaW5nIFwidXBzaWRlLWRvd25cIlxuICAgIC8vZm9yIGNsaWNrIGFuZCBkcmFnIGV2ZW50cywgaXQncyB3ZWlyZCBkdWUgdG8gdGhlIHNjYWxlKC0xLCAxKSBjc3MgcHJvcGVydHlcbiAgICBpZiAodGhpcy5vcHRpb25zLnZlcnRpY2FsICYmICFub0ludmVydCkge1xuICAgICAgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kIC0gbG9jYXRpb247XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdmVydCA9IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCxcbiAgICAgICAgaE9yVyA9IHZlcnQgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIGxPclQgPSB2ZXJ0ID8gJ3RvcCcgOiAnbGVmdCcsXG4gICAgICAgIGhhbmRsZURpbSA9ICRobmRsWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxuICAgICAgICBlbGVtRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtoT3JXXSxcbiAgICAgICAgLy9wZXJjZW50YWdlIG9mIGJhciBtaW4vbWF4IHZhbHVlIGJhc2VkIG9uIGNsaWNrIG9yIGRyYWcgcG9pbnRcbiAgICAgICAgcGN0T2ZCYXIgPSBwZXJjZW50KGxvY2F0aW9uIC0gdGhpcy5vcHRpb25zLnN0YXJ0LCB0aGlzLm9wdGlvbnMuZW5kIC0gdGhpcy5vcHRpb25zLnN0YXJ0KS50b0ZpeGVkKDIpLFxuICAgICAgICAvL251bWJlciBvZiBhY3R1YWwgcGl4ZWxzIHRvIHNoaWZ0IHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIG9idGFpbmVkIGFib3ZlXG4gICAgICAgIHB4VG9Nb3ZlID0gKGVsZW1EaW0gLSBoYW5kbGVEaW0pICogcGN0T2ZCYXIsXG4gICAgICAgIC8vcGVyY2VudGFnZSBvZiBiYXIgdG8gc2hpZnQgdGhlIGhhbmRsZVxuICAgICAgICBtb3ZlbWVudCA9IChwZXJjZW50KHB4VG9Nb3ZlLCBlbGVtRGltKSAqIDEwMCkudG9GaXhlZCh0aGlzLm9wdGlvbnMuZGVjaW1hbCk7XG4gICAgICAgIC8vZml4aW5nIHRoZSBkZWNpbWFsIHZhbHVlIGZvciB0aGUgbG9jYXRpb24gbnVtYmVyLCBpcyBwYXNzZWQgdG8gb3RoZXIgbWV0aG9kcyBhcyBhIGZpeGVkIGZsb2F0aW5nLXBvaW50IHZhbHVlXG4gICAgICAgIGxvY2F0aW9uID0gcGFyc2VGbG9hdChsb2NhdGlvbi50b0ZpeGVkKHRoaXMub3B0aW9ucy5kZWNpbWFsKSk7XG4gICAgICAgIC8vIGRlY2xhcmUgZW1wdHkgb2JqZWN0IGZvciBjc3MgYWRqdXN0bWVudHMsIG9ubHkgdXNlZCB3aXRoIDIgaGFuZGxlZC1zbGlkZXJzXG4gICAgdmFyIGNzcyA9IHt9O1xuXG4gICAgdGhpcy5fc2V0VmFsdWVzKCRobmRsLCBsb2NhdGlvbik7XG5cbiAgICAvLyBUT0RPIHVwZGF0ZSB0byBjYWxjdWxhdGUgYmFzZWQgb24gdmFsdWVzIHNldCB0byByZXNwZWN0aXZlIGlucHV0cz8/XG4gICAgaWYgKGlzRGJsKSB7XG4gICAgICB2YXIgaXNMZWZ0SG5kbCA9IHRoaXMuaGFuZGxlcy5pbmRleCgkaG5kbCkgPT09IDAsXG4gICAgICAgICAgLy9lbXB0eSB2YXJpYWJsZSwgd2lsbCBiZSB1c2VkIGZvciBtaW4taGVpZ2h0L3dpZHRoIGZvciBmaWxsIGJhclxuICAgICAgICAgIGRpbSxcbiAgICAgICAgICAvL3BlcmNlbnRhZ2Ugdy9oIG9mIHRoZSBoYW5kbGUgY29tcGFyZWQgdG8gdGhlIHNsaWRlciBiYXJcbiAgICAgICAgICBoYW5kbGVQY3QgPSAgfn4ocGVyY2VudChoYW5kbGVEaW0sIGVsZW1EaW0pICogMTAwKTtcbiAgICAgIC8vaWYgbGVmdCBoYW5kbGUsIHRoZSBtYXRoIGlzIHNsaWdodGx5IGRpZmZlcmVudCB0aGFuIGlmIGl0J3MgdGhlIHJpZ2h0IGhhbmRsZSwgYW5kIHRoZSBsZWZ0L3RvcCBwcm9wZXJ0eSBuZWVkcyB0byBiZSBjaGFuZ2VkIGZvciB0aGUgZmlsbCBiYXJcbiAgICAgIGlmIChpc0xlZnRIbmRsKSB7XG4gICAgICAgIC8vbGVmdCBvciB0b3AgcGVyY2VudGFnZSB2YWx1ZSB0byBhcHBseSB0byB0aGUgZmlsbCBiYXIuXG4gICAgICAgIGNzc1tsT3JUXSA9IGAke21vdmVtZW50fSVgO1xuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgbmV3IG1pbi1oZWlnaHQvd2lkdGggZm9yIHRoZSBmaWxsIGJhci5cbiAgICAgICAgZGltID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGUyWzBdLnN0eWxlW2xPclRdKSAtIG1vdmVtZW50ICsgaGFuZGxlUGN0O1xuICAgICAgICAvL3RoaXMgY2FsbGJhY2sgaXMgbmVjZXNzYXJ5IHRvIHByZXZlbnQgZXJyb3JzIGFuZCBhbGxvdyB0aGUgcHJvcGVyIHBsYWNlbWVudCBhbmQgaW5pdGlhbGl6YXRpb24gb2YgYSAyLWhhbmRsZWQgc2xpZGVyXG4gICAgICAgIC8vcGx1cywgaXQgbWVhbnMgd2UgZG9uJ3QgY2FyZSBpZiAnZGltJyBpc05hTiBvbiBpbml0LCBpdCB3b24ndCBiZSBpbiB0aGUgZnV0dXJlLlxuICAgICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH0vL3RoaXMgaXMgb25seSBuZWVkZWQgZm9yIHRoZSBpbml0aWFsaXphdGlvbiBvZiAyIGhhbmRsZWQgc2xpZGVyc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9qdXN0IGNhY2hpbmcgdGhlIHZhbHVlIG9mIHRoZSBsZWZ0L2JvdHRvbSBoYW5kbGUncyBsZWZ0L3RvcCBwcm9wZXJ0eVxuICAgICAgICB2YXIgaGFuZGxlUG9zID0gcGFyc2VGbG9hdCh0aGlzLiRoYW5kbGVbMF0uc3R5bGVbbE9yVF0pO1xuICAgICAgICAvL2NhbGN1bGF0ZSB0aGUgbmV3IG1pbi1oZWlnaHQvd2lkdGggZm9yIHRoZSBmaWxsIGJhci4gVXNlIGlzTmFOIHRvIHByZXZlbnQgZmFsc2UgcG9zaXRpdmVzIGZvciBudW1iZXJzIDw9IDBcbiAgICAgICAgLy9iYXNlZCBvbiB0aGUgcGVyY2VudGFnZSBvZiBtb3ZlbWVudCBvZiB0aGUgaGFuZGxlIGJlaW5nIG1hbmlwdWxhdGVkLCBsZXNzIHRoZSBvcHBvc2luZyBoYW5kbGUncyBsZWZ0L3RvcCBwb3NpdGlvbiwgcGx1cyB0aGUgcGVyY2VudGFnZSB3L2ggb2YgdGhlIGhhbmRsZSBpdHNlbGZcbiAgICAgICAgZGltID0gbW92ZW1lbnQgLSAoaXNOYU4oaGFuZGxlUG9zKSA/IHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQvKCh0aGlzLm9wdGlvbnMuZW5kLXRoaXMub3B0aW9ucy5zdGFydCkvMTAwKSA6IGhhbmRsZVBvcykgKyBoYW5kbGVQY3Q7XG4gICAgICB9XG4gICAgICAvLyBhc3NpZ24gdGhlIG1pbi1oZWlnaHQvd2lkdGggdG8gb3VyIGNzcyBvYmplY3RcbiAgICAgIGNzc1tgbWluLSR7aE9yV31gXSA9IGAke2RpbX0lYDtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uZSgnZmluaXNoZWQuemYuYW5pbWF0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgaGFuZGxlIGlzIGRvbmUgbW92aW5nLlxuICAgICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU2xpZGVyI21vdmVkXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdtb3ZlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgIC8vYmVjYXVzZSB3ZSBkb24ndCBrbm93IGV4YWN0bHkgaG93IHRoZSBoYW5kbGUgd2lsbCBiZSBtb3ZlZCwgY2hlY2sgdGhlIGFtb3VudCBvZiB0aW1lIGl0IHNob3VsZCB0YWtlIHRvIG1vdmUuXG4gICAgdmFyIG1vdmVUaW1lID0gdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpID8gMTAwMC82MCA6IHRoaXMub3B0aW9ucy5tb3ZlVGltZTtcblxuICAgIEZvdW5kYXRpb24uTW92ZShtb3ZlVGltZSwgJGhuZGwsIGZ1bmN0aW9uKCkge1xuICAgICAgLy9hZGp1c3RpbmcgdGhlIGxlZnQvdG9wIHByb3BlcnR5IG9mIHRoZSBoYW5kbGUsIGJhc2VkIG9uIHRoZSBwZXJjZW50YWdlIGNhbGN1bGF0ZWQgYWJvdmVcbiAgICAgICRobmRsLmNzcyhsT3JULCBgJHttb3ZlbWVudH0lYCk7XG5cbiAgICAgIGlmICghX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCkge1xuICAgICAgICAvL2lmIHNpbmdsZS1oYW5kbGVkLCBhIHNpbXBsZSBtZXRob2QgdG8gZXhwYW5kIHRoZSBmaWxsIGJhclxuICAgICAgICBfdGhpcy4kZmlsbC5jc3MoaE9yVywgYCR7cGN0T2ZCYXIgKiAxMDB9JWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9vdGhlcndpc2UsIHVzZSB0aGUgY3NzIG9iamVjdCB3ZSBjcmVhdGVkIGFib3ZlXG4gICAgICAgIF90aGlzLiRmaWxsLmNzcyhjc3MpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgdmFsdWUgaGFzIG5vdCBiZWVuIGNoYW5nZSBmb3IgYSBnaXZlbiB0aW1lLlxuICAgICAqIEBldmVudCBTbGlkZXIjY2hhbmdlZFxuICAgICAqL1xuICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignY2hhbmdlZC56Zi5zbGlkZXInLCBbJGhuZGxdKTtcbiAgICB9LCBfdGhpcy5vcHRpb25zLmNoYW5nZWREZWxheSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5pdGlhbCBhdHRyaWJ1dGUgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSBpbmRleCBvZiB0aGUgY3VycmVudCBoYW5kbGUvaW5wdXQgdG8gdXNlLlxuICAgKi9cbiAgX3NldEluaXRBdHRyKGlkeCkge1xuICAgIHZhciBpZCA9IHRoaXMuaW5wdXRzLmVxKGlkeCkuYXR0cignaWQnKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdzbGlkZXInKTtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoe1xuICAgICAgJ2lkJzogaWQsXG4gICAgICAnbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcbiAgICAgICdtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXG4gICAgICAnc3RlcCc6IHRoaXMub3B0aW9ucy5zdGVwXG4gICAgfSk7XG4gICAgdGhpcy5oYW5kbGVzLmVxKGlkeCkuYXR0cih7XG4gICAgICAncm9sZSc6ICdzbGlkZXInLFxuICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICdhcmlhLXZhbHVlbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcbiAgICAgICdhcmlhLXZhbHVlbWluJzogdGhpcy5vcHRpb25zLnN0YXJ0LFxuICAgICAgJ2FyaWEtdmFsdWVub3cnOiBpZHggPT09IDAgPyB0aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IDogdGhpcy5vcHRpb25zLmluaXRpYWxFbmQsXG4gICAgICAnYXJpYS1vcmllbnRhdGlvbic6IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCA/ICd2ZXJ0aWNhbCcgOiAnaG9yaXpvbnRhbCcsXG4gICAgICAndGFiaW5kZXgnOiAwXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgaW5wdXQgYW5kIGBhcmlhLXZhbHVlbm93YCB2YWx1ZXMgZm9yIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBoYW5kbGUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgLSBmbG9hdGluZyBwb2ludCBvZiB0aGUgbmV3IHZhbHVlLlxuICAgKi9cbiAgX3NldFZhbHVlcygkaGFuZGxlLCB2YWwpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID8gdGhpcy5oYW5kbGVzLmluZGV4KCRoYW5kbGUpIDogMDtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLnZhbCh2YWwpO1xuICAgICRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycsIHZhbCk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBldmVudHMgb24gdGhlIHNsaWRlciBlbGVtZW50LlxuICAgKiBDYWxjdWxhdGVzIHRoZSBuZXcgbG9jYXRpb24gb2YgdGhlIGN1cnJlbnQgaGFuZGxlLlxuICAgKiBJZiB0aGVyZSBhcmUgdHdvIGhhbmRsZXMgYW5kIHRoZSBiYXIgd2FzIGNsaWNrZWQsIGl0IGRldGVybWluZXMgd2hpY2ggaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZSAtIHRoZSBgZXZlbnRgIG9iamVjdCBwYXNzZWQgZnJvbSB0aGUgbGlzdGVuZXIuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGNhbGN1bGF0ZSBmb3IsIGlmIHNlbGVjdGVkLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsIC0gZmxvYXRpbmcgcG9pbnQgbnVtYmVyIGZvciB0aGUgbmV3IHZhbHVlIG9mIHRoZSBzbGlkZXIuXG4gICAqIFRPRE8gY2xlYW4gdGhpcyB1cCwgdGhlcmUncyBhIGxvdCBvZiByZXBlYXRlZCBjb2RlIGJldHdlZW4gdGhpcyBhbmQgdGhlIF9zZXRIYW5kbGVQb3MgZm4uXG4gICAqL1xuICBfaGFuZGxlRXZlbnQoZSwgJGhhbmRsZSwgdmFsKSB7XG4gICAgdmFyIHZhbHVlLCBoYXNWYWw7XG4gICAgaWYgKCF2YWwpIHsvL2NsaWNrIG9yIGRyYWcgZXZlbnRzXG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgIHZlcnRpY2FsID0gdGhpcy5vcHRpb25zLnZlcnRpY2FsLFxuICAgICAgICAgIHBhcmFtID0gdmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgICAgZGlyZWN0aW9uID0gdmVydGljYWwgPyAndG9wJyA6ICdsZWZ0JyxcbiAgICAgICAgICBldmVudE9mZnNldCA9IHZlcnRpY2FsID8gZS5wYWdlWSA6IGUucGFnZVgsXG4gICAgICAgICAgaGFsZk9mSGFuZGxlID0gdGhpcy4kaGFuZGxlWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW3BhcmFtXSAvIDIsXG4gICAgICAgICAgYmFyRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0sXG4gICAgICAgICAgd2luZG93U2Nyb2xsID0gdmVydGljYWwgPyAkKHdpbmRvdykuc2Nyb2xsVG9wKCkgOiAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpO1xuXG5cbiAgICAgIHZhciBlbGVtT2Zmc2V0ID0gdGhpcy4kZWxlbWVudC5vZmZzZXQoKVtkaXJlY3Rpb25dO1xuXG4gICAgICAvLyB0b3VjaCBldmVudHMgZW11bGF0ZWQgYnkgdGhlIHRvdWNoIHV0aWwgZ2l2ZSBwb3NpdGlvbiByZWxhdGl2ZSB0byBzY3JlZW4sIGFkZCB3aW5kb3cuc2Nyb2xsIHRvIGV2ZW50IGNvb3JkaW5hdGVzLi4uXG4gICAgICAvLyBiZXN0IHdheSB0byBndWVzcyB0aGlzIGlzIHNpbXVsYXRlZCBpcyBpZiBjbGllbnRZID09IHBhZ2VZXG4gICAgICBpZiAoZS5jbGllbnRZID09PSBlLnBhZ2VZKSB7IGV2ZW50T2Zmc2V0ID0gZXZlbnRPZmZzZXQgKyB3aW5kb3dTY3JvbGw7IH1cbiAgICAgIHZhciBldmVudEZyb21CYXIgPSBldmVudE9mZnNldCAtIGVsZW1PZmZzZXQ7XG4gICAgICB2YXIgYmFyWFk7XG4gICAgICBpZiAoZXZlbnRGcm9tQmFyIDwgMCkge1xuICAgICAgICBiYXJYWSA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGV2ZW50RnJvbUJhciA+IGJhckRpbSkge1xuICAgICAgICBiYXJYWSA9IGJhckRpbTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhclhZID0gZXZlbnRGcm9tQmFyO1xuICAgICAgfVxuICAgICAgdmFyIG9mZnNldFBjdCA9IHBlcmNlbnQoYmFyWFksIGJhckRpbSk7XG5cbiAgICAgIHZhbHVlID0gKHRoaXMub3B0aW9ucy5lbmQgLSB0aGlzLm9wdGlvbnMuc3RhcnQpICogb2Zmc2V0UGN0ICsgdGhpcy5vcHRpb25zLnN0YXJ0O1xuXG4gICAgICAvLyB0dXJuIGV2ZXJ5dGhpbmcgYXJvdW5kIGZvciBSVEwsIHlheSBtYXRoIVxuICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkgJiYgIXRoaXMub3B0aW9ucy52ZXJ0aWNhbCkge3ZhbHVlID0gdGhpcy5vcHRpb25zLmVuZCAtIHZhbHVlO31cblxuICAgICAgdmFsdWUgPSBfdGhpcy5fYWRqdXN0VmFsdWUobnVsbCwgdmFsdWUpO1xuICAgICAgLy9ib29sZWFuIGZsYWcgZm9yIHRoZSBzZXRIYW5kbGVQb3MgZm4sIHNwZWNpZmljYWxseSBmb3IgdmVydGljYWwgc2xpZGVyc1xuICAgICAgaGFzVmFsID0gZmFsc2U7XG5cbiAgICAgIGlmICghJGhhbmRsZSkgey8vZmlndXJlIG91dCB3aGljaCBoYW5kbGUgaXQgaXMsIHBhc3MgaXQgdG8gdGhlIG5leHQgZnVuY3Rpb24uXG4gICAgICAgIHZhciBmaXJzdEhuZGxQb3MgPSBhYnNQb3NpdGlvbih0aGlzLiRoYW5kbGUsIGRpcmVjdGlvbiwgYmFyWFksIHBhcmFtKSxcbiAgICAgICAgICAgIHNlY25kSG5kbFBvcyA9IGFic1Bvc2l0aW9uKHRoaXMuJGhhbmRsZTIsIGRpcmVjdGlvbiwgYmFyWFksIHBhcmFtKTtcbiAgICAgICAgICAgICRoYW5kbGUgPSBmaXJzdEhuZGxQb3MgPD0gc2VjbmRIbmRsUG9zID8gdGhpcy4kaGFuZGxlIDogdGhpcy4kaGFuZGxlMjtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7Ly9jaGFuZ2UgZXZlbnQgb24gaW5wdXRcbiAgICAgIHZhbHVlID0gdGhpcy5fYWRqdXN0VmFsdWUobnVsbCwgdmFsKTtcbiAgICAgIGhhc1ZhbCA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fc2V0SGFuZGxlUG9zKCRoYW5kbGUsIHZhbHVlLCBoYXNWYWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkanVzdGVzIHZhbHVlIGZvciBoYW5kbGUgaW4gcmVnYXJkIHRvIHN0ZXAgdmFsdWUuIHJldHVybnMgYWRqdXN0ZWQgdmFsdWVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIHNlbGVjdGVkIGhhbmRsZS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIC0gdmFsdWUgdG8gYWRqdXN0LiB1c2VkIGlmICRoYW5kbGUgaXMgZmFsc3lcbiAgICovXG4gIF9hZGp1c3RWYWx1ZSgkaGFuZGxlLCB2YWx1ZSkge1xuICAgIHZhciB2YWwsXG4gICAgICBzdGVwID0gdGhpcy5vcHRpb25zLnN0ZXAsXG4gICAgICBkaXYgPSBwYXJzZUZsb2F0KHN0ZXAvMiksXG4gICAgICBsZWZ0LCBwcmV2X3ZhbCwgbmV4dF92YWw7XG4gICAgaWYgKCEhJGhhbmRsZSkge1xuICAgICAgdmFsID0gcGFyc2VGbG9hdCgkaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFsID0gdmFsdWU7XG4gICAgfVxuICAgIGxlZnQgPSB2YWwgJSBzdGVwO1xuICAgIHByZXZfdmFsID0gdmFsIC0gbGVmdDtcbiAgICBuZXh0X3ZhbCA9IHByZXZfdmFsICsgc3RlcDtcbiAgICBpZiAobGVmdCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG4gICAgdmFsID0gdmFsID49IHByZXZfdmFsICsgZGl2ID8gbmV4dF92YWwgOiBwcmV2X3ZhbDtcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBzbGlkZXIgZWxlbWVudHMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50IGhhbmRsZSB0byBhcHBseSBsaXN0ZW5lcnMgdG8uXG4gICAqL1xuICBfZXZlbnRzKCRoYW5kbGUpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBjdXJIYW5kbGUsXG4gICAgICAgIHRpbWVyO1xuXG4gICAgICB0aGlzLmlucHV0cy5vZmYoJ2NoYW5nZS56Zi5zbGlkZXInKS5vbignY2hhbmdlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGlkeCA9IF90aGlzLmlucHV0cy5pbmRleCgkKHRoaXMpKTtcbiAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIF90aGlzLmhhbmRsZXMuZXEoaWR4KSwgJCh0aGlzKS52YWwoKSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jbGlja1NlbGVjdCkge1xuICAgICAgICB0aGlzLiRlbGVtZW50Lm9mZignY2xpY2suemYuc2xpZGVyJykub24oJ2NsaWNrLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZiAoX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgICAgICAgIGlmICghJChlLnRhcmdldCkuaXMoJ1tkYXRhLXNsaWRlci1oYW5kbGVdJykpIHtcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkKSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBfdGhpcy4kaGFuZGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGUpIHtcbiAgICAgIHRoaXMuaGFuZGxlcy5hZGRUb3VjaCgpO1xuXG4gICAgICB2YXIgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgICAkaGFuZGxlXG4gICAgICAgIC5vZmYoJ21vdXNlZG93bi56Zi5zbGlkZXInKVxuICAgICAgICAub24oJ21vdXNlZG93bi56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgJGhhbmRsZS5hZGRDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICBfdGhpcy4kZmlsbC5hZGRDbGFzcygnaXMtZHJhZ2dpbmcnKTsvL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgdHJ1ZSk7XG5cbiAgICAgICAgICBjdXJIYW5kbGUgPSAkKGUuY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgICAkYm9keS5vbignbW91c2Vtb3ZlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIF90aGlzLl9oYW5kbGVFdmVudChlLCBjdXJIYW5kbGUpO1xuXG4gICAgICAgICAgfSkub24oJ21vdXNldXAuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIGN1ckhhbmRsZSk7XG5cbiAgICAgICAgICAgICRoYW5kbGUucmVtb3ZlQ2xhc3MoJ2lzLWRyYWdnaW5nJyk7XG4gICAgICAgICAgICBfdGhpcy4kZmlsbC5yZW1vdmVDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2RyYWdnaW5nJywgZmFsc2UpO1xuXG4gICAgICAgICAgICAkYm9keS5vZmYoJ21vdXNlbW92ZS56Zi5zbGlkZXIgbW91c2V1cC56Zi5zbGlkZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgICAvLyBwcmV2ZW50IGV2ZW50cyB0cmlnZ2VyZWQgYnkgdG91Y2hcbiAgICAgIC5vbignc2VsZWN0c3RhcnQuemYuc2xpZGVyIHRvdWNobW92ZS56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgICRoYW5kbGUub2ZmKCdrZXlkb3duLnpmLnNsaWRlcicpLm9uKCdrZXlkb3duLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciBfJGhhbmRsZSA9ICQodGhpcyksXG4gICAgICAgICAgaWR4ID0gX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCA/IF90aGlzLmhhbmRsZXMuaW5kZXgoXyRoYW5kbGUpIDogMCxcbiAgICAgICAgICBvbGRWYWx1ZSA9IHBhcnNlRmxvYXQoX3RoaXMuaW5wdXRzLmVxKGlkeCkudmFsKCkpLFxuICAgICAgICAgIG5ld1ZhbHVlO1xuXG4gICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnU2xpZGVyJywge1xuICAgICAgICBkZWNyZWFzZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSAtIF90aGlzLm9wdGlvbnMuc3RlcDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgKyBfdGhpcy5vcHRpb25zLnN0ZXA7XG4gICAgICAgIH0sXG4gICAgICAgIGRlY3JlYXNlX2Zhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gb2xkVmFsdWUgLSBfdGhpcy5vcHRpb25zLnN0ZXAgKiAxMDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2VfZmFzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSArIF90aGlzLm9wdGlvbnMuc3RlcCAqIDEwO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHsgLy8gb25seSBzZXQgaGFuZGxlIHBvcyB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkIHNwZWNpYWxseVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5fc2V0SGFuZGxlUG9zKF8kaGFuZGxlLCBuZXdWYWx1ZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLyppZiAobmV3VmFsdWUpIHsgLy8gaWYgcHJlc3NlZCBrZXkgaGFzIHNwZWNpYWwgZnVuY3Rpb24sIHVwZGF0ZSB2YWx1ZVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlKTtcbiAgICAgIH0qL1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBzbGlkZXIgcGx1Z2luLlxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmhhbmRsZXMub2ZmKCcuemYuc2xpZGVyJyk7XG4gICAgdGhpcy5pbnB1dHMub2ZmKCcuemYuc2xpZGVyJyk7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy56Zi5zbGlkZXInKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5TbGlkZXIuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBNaW5pbXVtIHZhbHVlIGZvciB0aGUgc2xpZGVyIHNjYWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDBcbiAgICovXG4gIHN0YXJ0OiAwLFxuICAvKipcbiAgICogTWF4aW11bSB2YWx1ZSBmb3IgdGhlIHNsaWRlciBzY2FsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMDBcbiAgICovXG4gIGVuZDogMTAwLFxuICAvKipcbiAgICogTWluaW11bSB2YWx1ZSBjaGFuZ2UgcGVyIGNoYW5nZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBzdGVwOiAxLFxuICAvKipcbiAgICogVmFsdWUgYXQgd2hpY2ggdGhlIGhhbmRsZS9pbnB1dCAqKGxlZnQgaGFuZGxlL2ZpcnN0IGlucHV0KSogc2hvdWxkIGJlIHNldCB0byBvbiBpbml0aWFsaXphdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAwXG4gICAqL1xuICBpbml0aWFsU3RhcnQ6IDAsXG4gIC8qKlxuICAgKiBWYWx1ZSBhdCB3aGljaCB0aGUgcmlnaHQgaGFuZGxlL3NlY29uZCBpbnB1dCBzaG91bGQgYmUgc2V0IHRvIG9uIGluaXRpYWxpemF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEwMFxuICAgKi9cbiAgaW5pdGlhbEVuZDogMTAwLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBpbnB1dCB0byBiZSBsb2NhdGVkIG91dHNpZGUgdGhlIGNvbnRhaW5lciBhbmQgdmlzaWJsZS4gU2V0IHRvIGJ5IHRoZSBKU1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBiaW5kaW5nOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBjbGljay90YXAgb24gdGhlIHNsaWRlciBiYXIgdG8gc2VsZWN0IGEgdmFsdWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tTZWxlY3Q6IHRydWUsXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBhbmQgdXNlIHRoZSBgdmVydGljYWxgIGNsYXNzIHRvIGNoYW5nZSBhbGlnbm1lbnQgdG8gdmVydGljYWwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgdXNlciB0byBkcmFnIHRoZSBzbGlkZXIgaGFuZGxlKHMpIHRvIHNlbGVjdCBhIHZhbHVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGRyYWdnYWJsZTogdHJ1ZSxcbiAgLyoqXG4gICAqIERpc2FibGVzIHRoZSBzbGlkZXIgYW5kIHByZXZlbnRzIGV2ZW50IGxpc3RlbmVycyBmcm9tIGJlaW5nIGFwcGxpZWQuIERvdWJsZSBjaGVja2VkIGJ5IEpTIHdpdGggYGRpc2FibGVkQ2xhc3NgLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlZDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHVzZSBvZiB0d28gaGFuZGxlcy4gRG91YmxlIGNoZWNrZWQgYnkgdGhlIEpTLiBDaGFuZ2VzIHNvbWUgbG9naWMgaGFuZGxpbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRvdWJsZVNpZGVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIFBvdGVudGlhbCBmdXR1cmUgZmVhdHVyZS5cbiAgICovXG4gIC8vIHN0ZXBzOiAxMDAsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdGhlIHBsdWdpbiBzaG91bGQgZ28gdG8gZm9yIGZsb2F0aW5nIHBvaW50IHByZWNpc2lvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyXG4gICAqL1xuICBkZWNpbWFsOiAyLFxuICAvKipcbiAgICogVGltZSBkZWxheSBmb3IgZHJhZ2dlZCBlbGVtZW50cy5cbiAgICovXG4gIC8vIGRyYWdEZWxheTogMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCB0byBhbmltYXRlIHRoZSBtb3ZlbWVudCBvZiBhIHNsaWRlciBoYW5kbGUgaWYgdXNlciBjbGlja3MvdGFwcyBvbiB0aGUgYmFyLiBOZWVkcyB0byBiZSBtYW51YWxseSBzZXQgaWYgdXBkYXRpbmcgdGhlIHRyYW5zaXRpb24gdGltZSBpbiB0aGUgU2FzcyBzZXR0aW5ncy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyMDBcbiAgICovXG4gIG1vdmVUaW1lOiAyMDAsLy91cGRhdGUgdGhpcyBpZiBjaGFuZ2luZyB0aGUgdHJhbnNpdGlvbiB0aW1lIGluIHRoZSBzYXNzXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIGRpc2FibGVkIHNsaWRlcnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2Rpc2FibGVkJ1xuICAgKi9cbiAgZGlzYWJsZWRDbGFzczogJ2Rpc2FibGVkJyxcbiAgLyoqXG4gICAqIFdpbGwgaW52ZXJ0IHRoZSBkZWZhdWx0IGxheW91dCBmb3IgYSB2ZXJ0aWNhbDxzcGFuIGRhdGEtdG9vbHRpcCB0aXRsZT1cIndobyB3b3VsZCBkbyB0aGlzPz8/XCI+IDwvc3Bhbj5zbGlkZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGludmVydFZlcnRpY2FsOiBmYWxzZSxcbiAgLyoqXG4gICAqIE1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIGBjaGFuZ2VkLnpmLXNsaWRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIGFmdGVyIHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGNoYW5nZWREZWxheTogNTAwXG59O1xuXG5mdW5jdGlvbiBwZXJjZW50KGZyYWMsIG51bSkge1xuICByZXR1cm4gKGZyYWMgLyBudW0pO1xufVxuZnVuY3Rpb24gYWJzUG9zaXRpb24oJGhhbmRsZSwgZGlyLCBjbGlja1BvcywgcGFyYW0pIHtcbiAgcmV0dXJuIE1hdGguYWJzKCgkaGFuZGxlLnBvc2l0aW9uKClbZGlyXSArICgkaGFuZGxlW3BhcmFtXSgpIC8gMikpIC0gY2xpY2tQb3MpO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU2xpZGVyLCAnU2xpZGVyJyk7XG5cbn0oalF1ZXJ5KTtcblxuLy8qKioqKioqKip0aGlzIGlzIGluIGNhc2Ugd2UgZ28gdG8gc3RhdGljLCBhYnNvbHV0ZSBwb3NpdGlvbnMgaW5zdGVhZCBvZiBkeW5hbWljIHBvc2l0aW9uaW5nKioqKioqKipcbi8vIHRoaXMuc2V0U3RlcHMoZnVuY3Rpb24oKSB7XG4vLyAgIF90aGlzLl9ldmVudHMoKTtcbi8vICAgdmFyIGluaXRTdGFydCA9IF90aGlzLm9wdGlvbnMucG9zaXRpb25zW190aGlzLm9wdGlvbnMuaW5pdGlhbFN0YXJ0IC0gMV0gfHwgbnVsbDtcbi8vICAgdmFyIGluaXRFbmQgPSBfdGhpcy5vcHRpb25zLmluaXRpYWxFbmQgPyBfdGhpcy5vcHRpb25zLnBvc2l0aW9uW190aGlzLm9wdGlvbnMuaW5pdGlhbEVuZCAtIDFdIDogbnVsbDtcbi8vICAgaWYgKGluaXRTdGFydCB8fCBpbml0RW5kKSB7XG4vLyAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGluaXRTdGFydCwgaW5pdEVuZCk7XG4vLyAgIH1cbi8vIH0pO1xuXG4vLyoqKioqKioqKioqdGhlIG90aGVyIHBhcnQgb2YgYWJzb2x1dGUgcG9zaXRpb25zKioqKioqKioqKioqKlxuLy8gU2xpZGVyLnByb3RvdHlwZS5zZXRTdGVwcyA9IGZ1bmN0aW9uKGNiKSB7XG4vLyAgIHZhciBwb3NDaGFuZ2UgPSB0aGlzLiRlbGVtZW50Lm91dGVyV2lkdGgoKSAvIHRoaXMub3B0aW9ucy5zdGVwcztcbi8vICAgdmFyIGNvdW50ZXIgPSAwXG4vLyAgIHdoaWxlKGNvdW50ZXIgPCB0aGlzLm9wdGlvbnMuc3RlcHMpIHtcbi8vICAgICBpZiAoY291bnRlcikge1xuLy8gICAgICAgdGhpcy5vcHRpb25zLnBvc2l0aW9ucy5wdXNoKHRoaXMub3B0aW9ucy5wb3NpdGlvbnNbY291bnRlciAtIDFdICsgcG9zQ2hhbmdlKTtcbi8vICAgICB9IGVsc2Uge1xuLy8gICAgICAgdGhpcy5vcHRpb25zLnBvc2l0aW9ucy5wdXNoKHBvc0NoYW5nZSk7XG4vLyAgICAgfVxuLy8gICAgIGNvdW50ZXIrKztcbi8vICAgfVxuLy8gICBjYigpO1xuLy8gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBTdGlja3kgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnN0aWNreVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgU3RpY2t5IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBzdGlja3kgdGhpbmcuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBzdGlja3kuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb3B0aW9ucyBvYmplY3QgcGFzc2VkIHdoZW4gY3JlYXRpbmcgdGhlIGVsZW1lbnQgcHJvZ3JhbW1hdGljYWxseS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgU3RpY2t5LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdTdGlja3knKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgc3RpY2t5IGVsZW1lbnQgYnkgYWRkaW5nIGNsYXNzZXMsIGdldHRpbmcvc2V0dGluZyBkaW1lbnNpb25zLCBicmVha3BvaW50cyBhbmQgYXR0cmlidXRlc1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkcGFyZW50ID0gdGhpcy4kZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN0aWNreS1jb250YWluZXJdJyksXG4gICAgICAgIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdzdGlja3knKSxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKCEkcGFyZW50Lmxlbmd0aCkge1xuICAgICAgdGhpcy53YXNXcmFwcGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy4kY29udGFpbmVyID0gJHBhcmVudC5sZW5ndGggPyAkcGFyZW50IDogJCh0aGlzLm9wdGlvbnMuY29udGFpbmVyKS53cmFwSW5uZXIodGhpcy4kZWxlbWVudCk7XG4gICAgdGhpcy4kY29udGFpbmVyLmFkZENsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKHRoaXMub3B0aW9ucy5zdGlja3lDbGFzcylcbiAgICAgICAgICAgICAgICAgLmF0dHIoeydkYXRhLXJlc2l6ZSc6IGlkfSk7XG5cbiAgICB0aGlzLnNjcm9sbENvdW50ID0gdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgdGhpcy5pc1N0dWNrID0gZmFsc2U7XG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZC56Zi5zdGlja3knLCBmdW5jdGlvbigpe1xuICAgICAgLy9XZSBjYWxjdWxhdGUgdGhlIGNvbnRhaW5lciBoZWlnaHQgdG8gaGF2ZSBjb3JyZWN0IHZhbHVlcyBmb3IgYW5jaG9yIHBvaW50cyBvZmZzZXQgY2FsY3VsYXRpb24uXG4gICAgICBfdGhpcy5jb250YWluZXJIZWlnaHQgPSBfdGhpcy4kZWxlbWVudC5jc3MoXCJkaXNwbGF5XCIpID09IFwibm9uZVwiID8gMCA6IF90aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgIF90aGlzLiRjb250YWluZXIuY3NzKCdoZWlnaHQnLCBfdGhpcy5jb250YWluZXJIZWlnaHQpO1xuICAgICAgX3RoaXMuZWxlbUhlaWdodCA9IF90aGlzLmNvbnRhaW5lckhlaWdodDtcbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuYW5jaG9yICE9PSAnJyl7XG4gICAgICAgIF90aGlzLiRhbmNob3IgPSAkKCcjJyArIF90aGlzLm9wdGlvbnMuYW5jaG9yKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBfdGhpcy5fcGFyc2VQb2ludHMoKTtcbiAgICAgIH1cblxuICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCl7XG4gICAgICAgIF90aGlzLl9jYWxjKGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgX3RoaXMuX2V2ZW50cyhpZC5zcGxpdCgnLScpLnJldmVyc2UoKS5qb2luKCctJykpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIElmIHVzaW5nIG11bHRpcGxlIGVsZW1lbnRzIGFzIGFuY2hvcnMsIGNhbGN1bGF0ZXMgdGhlIHRvcCBhbmQgYm90dG9tIHBpeGVsIHZhbHVlcyB0aGUgc3RpY2t5IHRoaW5nIHNob3VsZCBzdGljayBhbmQgdW5zdGljayBvbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcGFyc2VQb2ludHMoKSB7XG4gICAgdmFyIHRvcCA9IHRoaXMub3B0aW9ucy50b3BBbmNob3IgPT0gXCJcIiA/IDEgOiB0aGlzLm9wdGlvbnMudG9wQW5jaG9yLFxuICAgICAgICBidG0gPSB0aGlzLm9wdGlvbnMuYnRtQW5jaG9yPT0gXCJcIiA/IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgOiB0aGlzLm9wdGlvbnMuYnRtQW5jaG9yLFxuICAgICAgICBwdHMgPSBbdG9wLCBidG1dLFxuICAgICAgICBicmVha3MgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcHRzLmxlbmd0aDsgaSA8IGxlbiAmJiBwdHNbaV07IGkrKykge1xuICAgICAgdmFyIHB0O1xuICAgICAgaWYgKHR5cGVvZiBwdHNbaV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgIHB0ID0gcHRzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBsYWNlID0gcHRzW2ldLnNwbGl0KCc6JyksXG4gICAgICAgICAgICBhbmNob3IgPSAkKGAjJHtwbGFjZVswXX1gKTtcblxuICAgICAgICBwdCA9IGFuY2hvci5vZmZzZXQoKS50b3A7XG4gICAgICAgIGlmIChwbGFjZVsxXSAmJiBwbGFjZVsxXS50b0xvd2VyQ2FzZSgpID09PSAnYm90dG9tJykge1xuICAgICAgICAgIHB0ICs9IGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrc1tpXSA9IHB0O1xuICAgIH1cblxuXG4gICAgdGhpcy5wb2ludHMgPSBicmVha3M7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBzY3JvbGxpbmcgZWxlbWVudC5cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIC0gcHN1ZWRvLXJhbmRvbSBpZCBmb3IgdW5pcXVlIHNjcm9sbCBldmVudCBsaXN0ZW5lci5cbiAgICovXG4gIF9ldmVudHMoaWQpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBzY3JvbGxMaXN0ZW5lciA9IHRoaXMuc2Nyb2xsTGlzdGVuZXIgPSBgc2Nyb2xsLnpmLiR7aWR9YDtcbiAgICBpZiAodGhpcy5pc09uKSB7IHJldHVybjsgfVxuICAgIGlmICh0aGlzLmNhblN0aWNrKSB7XG4gICAgICB0aGlzLmlzT24gPSB0cnVlO1xuICAgICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcilcbiAgICAgICAgICAgICAgIC5vbihzY3JvbGxMaXN0ZW5lciwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Nyb2xsQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudCA9IF90aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5zY3JvbGxDb3VudC0tO1xuICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlLCB3aW5kb3cucGFnZVlPZmZzZXQpO1xuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdyZXNpemVtZS56Zi50cmlnZ2VyJylcbiAgICAgICAgICAgICAgICAgLm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSwgZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXRTaXplcyhmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuY2FuU3RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIV90aGlzLmlzT24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9ldmVudHMoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBldmVudCBoYW5kbGVycyBmb3Igc2Nyb2xsIGFuZCBjaGFuZ2UgZXZlbnRzIG9uIGFuY2hvci5cbiAgICogQGZpcmVzIFN0aWNreSNwYXVzZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2Nyb2xsTGlzdGVuZXIgLSB1bmlxdWUsIG5hbWVzcGFjZWQgc2Nyb2xsIGxpc3RlbmVyIGF0dGFjaGVkIHRvIGB3aW5kb3dgXG4gICAqL1xuICBfcGF1c2VMaXN0ZW5lcnMoc2Nyb2xsTGlzdGVuZXIpIHtcbiAgICB0aGlzLmlzT24gPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub2ZmKHNjcm9sbExpc3RlbmVyKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBpcyBwYXVzZWQgZHVlIHRvIHJlc2l6ZSBldmVudCBzaHJpbmtpbmcgdGhlIHZpZXcuXG4gICAgICogQGV2ZW50IFN0aWNreSNwYXVzZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncGF1c2UuemYuc3RpY2t5Jyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIG9uIGV2ZXJ5IGBzY3JvbGxgIGV2ZW50IGFuZCBvbiBgX2luaXRgXG4gICAqIGZpcmVzIGZ1bmN0aW9ucyBiYXNlZCBvbiBib29sZWFucyBhbmQgY2FjaGVkIHZhbHVlc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGNoZWNrU2l6ZXMgLSB0cnVlIGlmIHBsdWdpbiBzaG91bGQgcmVjYWxjdWxhdGUgc2l6ZXMgYW5kIGJyZWFrcG9pbnRzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gc2Nyb2xsIC0gY3VycmVudCBzY3JvbGwgcG9zaXRpb24gcGFzc2VkIGZyb20gc2Nyb2xsIGV2ZW50IGNiIGZ1bmN0aW9uLiBJZiBub3QgcGFzc2VkLCBkZWZhdWx0cyB0byBgd2luZG93LnBhZ2VZT2Zmc2V0YC5cbiAgICovXG4gIF9jYWxjKGNoZWNrU2l6ZXMsIHNjcm9sbCkge1xuICAgIGlmIChjaGVja1NpemVzKSB7IHRoaXMuX3NldFNpemVzKCk7IH1cblxuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFzY3JvbGwpIHsgc2Nyb2xsID0gd2luZG93LnBhZ2VZT2Zmc2V0OyB9XG5cbiAgICBpZiAoc2Nyb2xsID49IHRoaXMudG9wUG9pbnQpIHtcbiAgICAgIGlmIChzY3JvbGwgPD0gdGhpcy5ib3R0b21Qb2ludCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3NldFN0aWNreSgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5pc1N0dWNrKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSAkZWxlbWVudCB0byBiZWNvbWUgc3R1Y2suXG4gICAqIEFkZHMgYHBvc2l0aW9uOiBmaXhlZDtgLCBhbmQgaGVscGVyIGNsYXNzZXMuXG4gICAqIEBmaXJlcyBTdGlja3kjc3R1Y2t0b1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRTdGlja3koKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBtcmduID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnbWFyZ2luVG9wJyA6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICBub3RTdHVja1RvID0gc3RpY2tUbyA9PT0gJ3RvcCcgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICBjc3MgPSB7fTtcblxuICAgIGNzc1ttcmduXSA9IGAke3RoaXMub3B0aW9uc1ttcmduXX1lbWA7XG4gICAgY3NzW3N0aWNrVG9dID0gMDtcbiAgICBjc3Nbbm90U3R1Y2tUb10gPSAnYXV0byc7XG4gICAgY3NzWydsZWZ0J10gPSB0aGlzLiRjb250YWluZXIub2Zmc2V0KCkubGVmdCArIHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuJGNvbnRhaW5lclswXSlbXCJwYWRkaW5nLWxlZnRcIl0sIDEwKTtcbiAgICB0aGlzLmlzU3R1Y2sgPSB0cnVlO1xuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7bm90U3R1Y2tUb31gKVxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxuICAgICAgICAgICAgICAgICAuY3NzKGNzcylcbiAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlICRlbGVtZW50IGhhcyBiZWNvbWUgYHBvc2l0aW9uOiBmaXhlZDtgXG4gICAgICAgICAgICAgICAgICAqIE5hbWVzcGFjZWQgdG8gYHRvcGAgb3IgYGJvdHRvbWAsIGUuZy4gYHN0aWNreS56Zi5zdHVja3RvOnRvcGBcbiAgICAgICAgICAgICAgICAgICogQGV2ZW50IFN0aWNreSNzdHVja3RvXG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAudHJpZ2dlcihgc3RpY2t5LnpmLnN0dWNrdG86JHtzdGlja1RvfWApO1xuICAgIHRoaXMuJGVsZW1lbnQub24oXCJ0cmFuc2l0aW9uZW5kIHdlYmtpdFRyYW5zaXRpb25FbmQgb1RyYW5zaXRpb25FbmQgb3RyYW5zaXRpb25lbmQgTVNUcmFuc2l0aW9uRW5kXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuX3NldFNpemVzKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2F1c2VzIHRoZSAkZWxlbWVudCB0byBiZWNvbWUgdW5zdHVjay5cbiAgICogUmVtb3ZlcyBgcG9zaXRpb246IGZpeGVkO2AsIGFuZCBoZWxwZXIgY2xhc3Nlcy5cbiAgICogQWRkcyBvdGhlciBoZWxwZXIgY2xhc3Nlcy5cbiAgICogQHBhcmFtIHtCb29sZWFufSBpc1RvcCAtIHRlbGxzIHRoZSBmdW5jdGlvbiBpZiB0aGUgJGVsZW1lbnQgc2hvdWxkIGFuY2hvciB0byB0aGUgdG9wIG9yIGJvdHRvbSBvZiBpdHMgJGFuY2hvciBlbGVtZW50LlxuICAgKiBAZmlyZXMgU3RpY2t5I3Vuc3R1Y2tmcm9tXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVtb3ZlU3RpY2t5KGlzVG9wKSB7XG4gICAgdmFyIHN0aWNrVG8gPSB0aGlzLm9wdGlvbnMuc3RpY2tUbyxcbiAgICAgICAgc3RpY2tUb1RvcCA9IHN0aWNrVG8gPT09ICd0b3AnLFxuICAgICAgICBjc3MgPSB7fSxcbiAgICAgICAgYW5jaG9yUHQgPSAodGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1sxXSAtIHRoaXMucG9pbnRzWzBdIDogdGhpcy5hbmNob3JIZWlnaHQpIC0gdGhpcy5lbGVtSGVpZ2h0LFxuICAgICAgICBtcmduID0gc3RpY2tUb1RvcCA/ICdtYXJnaW5Ub3AnIDogJ21hcmdpbkJvdHRvbScsXG4gICAgICAgIG5vdFN0dWNrVG8gPSBzdGlja1RvVG9wID8gJ2JvdHRvbScgOiAndG9wJyxcbiAgICAgICAgdG9wT3JCb3R0b20gPSBpc1RvcCA/ICd0b3AnIDogJ2JvdHRvbSc7XG5cbiAgICBjc3NbbXJnbl0gPSAwO1xuXG4gICAgY3NzWydib3R0b20nXSA9ICdhdXRvJztcbiAgICBpZihpc1RvcCkge1xuICAgICAgY3NzWyd0b3AnXSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNzc1sndG9wJ10gPSBhbmNob3JQdDtcbiAgICB9XG5cbiAgICBjc3NbJ2xlZnQnXSA9ICcnO1xuICAgIHRoaXMuaXNTdHVjayA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7dG9wT3JCb3R0b219YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGFuY2hvcmVkLlxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYudW5zdHVja2Zyb206Ym90dG9tYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3Vuc3R1Y2tmcm9tXG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAudHJpZ2dlcihgc3RpY2t5LnpmLnVuc3R1Y2tmcm9tOiR7dG9wT3JCb3R0b219YCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgJGVsZW1lbnQgYW5kICRjb250YWluZXIgc2l6ZXMgZm9yIHBsdWdpbi5cbiAgICogQ2FsbHMgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uIG9mIGBfc2V0QnJlYWtQb2ludHNgLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFNpemVzKGNiKSB7XG4gICAgdGhpcy5jYW5TdGljayA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5hdExlYXN0KHRoaXMub3B0aW9ucy5zdGlja3lPbik7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgbmV3RWxlbVdpZHRoID0gdGhpcy4kY29udGFpbmVyWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoLFxuICAgICAgICBjb21wID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy4kY29udGFpbmVyWzBdKSxcbiAgICAgICAgcGRuZyA9IHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctcmlnaHQnXSwgMTApO1xuXG4gICAgaWYgKHRoaXMuJGFuY2hvciAmJiB0aGlzLiRhbmNob3IubGVuZ3RoKSB7XG4gICAgICB0aGlzLmFuY2hvckhlaWdodCA9IHRoaXMuJGFuY2hvclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3BhcnNlUG9pbnRzKCk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5jc3Moe1xuICAgICAgJ21heC13aWR0aCc6IGAke25ld0VsZW1XaWR0aCAtIHBkbmd9cHhgXG4gICAgfSk7XG5cbiAgICB2YXIgbmV3Q29udGFpbmVySGVpZ2h0ID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgfHwgdGhpcy5jb250YWluZXJIZWlnaHQ7XG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuY3NzKFwiZGlzcGxheVwiKSA9PSBcIm5vbmVcIikge1xuICAgICAgbmV3Q29udGFpbmVySGVpZ2h0ID0gMDtcbiAgICB9XG4gICAgdGhpcy5jb250YWluZXJIZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG4gICAgdGhpcy4kY29udGFpbmVyLmNzcyh7XG4gICAgICBoZWlnaHQ6IG5ld0NvbnRhaW5lckhlaWdodFxuICAgIH0pO1xuICAgIHRoaXMuZWxlbUhlaWdodCA9IG5ld0NvbnRhaW5lckhlaWdodDtcblxuICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcImxlZnRcIjp0aGlzLiRjb250YWluZXIub2Zmc2V0KCkubGVmdCArIHBhcnNlSW50KGNvbXBbJ3BhZGRpbmctbGVmdCddLCAxMCl9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLWF0LWJvdHRvbScpKSB7XG4gICAgICAgIHZhciBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy4kY29udGFpbmVyLm9mZnNldCgpLnRvcCA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodDtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5jc3MoJ3RvcCcsIGFuY2hvclB0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zZXRCcmVha1BvaW50cyhuZXdDb250YWluZXJIZWlnaHQsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdXBwZXIgYW5kIGxvd2VyIGJyZWFrcG9pbnRzIGZvciB0aGUgZWxlbWVudCB0byBiZWNvbWUgc3RpY2t5L3Vuc3RpY2t5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZWxlbUhlaWdodCAtIHB4IHZhbHVlIGZvciBzdGlja3kuJGVsZW1lbnQgaGVpZ2h0LCBjYWxjdWxhdGVkIGJ5IGBfc2V0U2l6ZXNgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBjb21wbGV0aW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldEJyZWFrUG9pbnRzKGVsZW1IZWlnaHQsIGNiKSB7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICAgIGVsc2UgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgdmFyIG1Ub3AgPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpblRvcCksXG4gICAgICAgIG1CdG0gPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpbkJvdHRvbSksXG4gICAgICAgIHRvcFBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1swXSA6IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AsXG4gICAgICAgIGJvdHRvbVBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1sxXSA6IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQsXG4gICAgICAgIC8vIHRvcFBvaW50ID0gdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCB8fCB0aGlzLnBvaW50c1swXSxcbiAgICAgICAgLy8gYm90dG9tUG9pbnQgPSB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0IHx8IHRoaXMucG9pbnRzWzFdLFxuICAgICAgICB3aW5IZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICd0b3AnKSB7XG4gICAgICB0b3BQb2ludCAtPSBtVG9wO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKGVsZW1IZWlnaHQgKyBtVG9wKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAnYm90dG9tJykge1xuICAgICAgdG9wUG9pbnQgLT0gKHdpbkhlaWdodCAtIChlbGVtSGVpZ2h0ICsgbUJ0bSkpO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKHdpbkhlaWdodCAtIG1CdG0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvL3RoaXMgd291bGQgYmUgdGhlIHN0aWNrVG86IGJvdGggb3B0aW9uLi4uIHRyaWNreVxuICAgIH1cblxuICAgIHRoaXMudG9wUG9pbnQgPSB0b3BQb2ludDtcbiAgICB0aGlzLmJvdHRvbVBvaW50ID0gYm90dG9tUG9pbnQ7XG5cbiAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgY3VycmVudCBzdGlja3kgZWxlbWVudC5cbiAgICogUmVzZXRzIHRoZSBlbGVtZW50IHRvIHRoZSB0b3AgcG9zaXRpb24gZmlyc3QuXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzLCBKUy1hZGRlZCBjc3MgcHJvcGVydGllcyBhbmQgY2xhc3NlcywgYW5kIHVud3JhcHMgdGhlICRlbGVtZW50IGlmIHRoZSBKUyBhZGRlZCB0aGUgJGNvbnRhaW5lci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcblxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnN0aWNreUNsYXNzfSBpcy1hbmNob3JlZCBpcy1hdC10b3BgKVxuICAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnLFxuICAgICAgICAgICAgICAgICAgIHRvcDogJycsXG4gICAgICAgICAgICAgICAgICAgYm90dG9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAnbWF4LXdpZHRoJzogJydcbiAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgLm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignY2hhbmdlLnpmLnN0aWNreScpO1xuICAgIH1cbiAgICAkKHdpbmRvdykub2ZmKHRoaXMuc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xuICAgICAgdGhpcy4kZWxlbWVudC51bndyYXAoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblN0aWNreS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEN1c3RvbWl6YWJsZSBjb250YWluZXIgdGVtcGxhdGUuIEFkZCB5b3VyIG93biBjbGFzc2VzIGZvciBzdHlsaW5nIGFuZCBzaXppbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyIGNsYXNzPVwic21hbGwtNiBjb2x1bW5zXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xuICAgKi9cbiAgY29udGFpbmVyOiAnPGRpdiBkYXRhLXN0aWNreS1jb250YWluZXI+PC9kaXY+JyxcbiAgLyoqXG4gICAqIExvY2F0aW9uIGluIHRoZSB2aWV3IHRoZSBlbGVtZW50IHN0aWNrcyB0by5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgc3RpY2tUbzogJ3RvcCcsXG4gIC8qKlxuICAgKiBJZiBhbmNob3JlZCB0byBhIHNpbmdsZSBlbGVtZW50LCB0aGUgaWQgb2YgdGhhdCBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQnXG4gICAqL1xuICBhbmNob3I6ICcnLFxuICAvKipcbiAgICogSWYgdXNpbmcgbW9yZSB0aGFuIG9uZSBlbGVtZW50IGFzIGFuY2hvciBwb2ludHMsIHRoZSBpZCBvZiB0aGUgdG9wIGFuY2hvci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZXhhbXBsZUlkOnRvcCdcbiAgICovXG4gIHRvcEFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSBib3R0b20gYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6Ym90dG9tJ1xuICAgKi9cbiAgYnRtQW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSB0b3Agb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBtYXJnaW5Ub3A6IDEsXG4gIC8qKlxuICAgKiBNYXJnaW4sIGluIGBlbWAncyB0byBhcHBseSB0byB0aGUgYm90dG9tIG9mIHRoZSBlbGVtZW50IHdoZW4gaXQgYmVjb21lcyBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgbWFyZ2luQm90dG9tOiAxLFxuICAvKipcbiAgICogQnJlYWtwb2ludCBzdHJpbmcgdGhhdCBpcyB0aGUgbWluaW11bSBzY3JlZW4gc2l6ZSBhbiBlbGVtZW50IHNob3VsZCBiZWNvbWUgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBzdGlja3lPbjogJ21lZGl1bScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBlbGVtZW50LCBhbmQgcmVtb3ZlZCBvbiBkZXN0cnVjdGlvbi4gRm91bmRhdGlvbiBkZWZhdWx0cyB0byBgc3RpY2t5YC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5J1xuICAgKi9cbiAgc3RpY2t5Q2xhc3M6ICdzdGlja3knLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBzdGlja3kgY29udGFpbmVyLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3ktY29udGFpbmVyYC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5LWNvbnRhaW5lcidcbiAgICovXG4gIGNvbnRhaW5lckNsYXNzOiAnc3RpY2t5LWNvbnRhaW5lcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygc2Nyb2xsIGV2ZW50cyBiZXR3ZWVuIHRoZSBwbHVnaW4ncyByZWNhbGN1bGF0aW5nIHN0aWNreSBwb2ludHMuIFNldHRpbmcgaXQgdG8gYDBgIHdpbGwgY2F1c2UgaXQgdG8gcmVjYWxjIGV2ZXJ5IHNjcm9sbCBldmVudCwgc2V0dGluZyBpdCB0byBgLTFgIHdpbGwgcHJldmVudCByZWNhbGMgb24gc2Nyb2xsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBjaGVja0V2ZXJ5OiAtMVxufTtcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY2FsY3VsYXRlIGVtIHZhbHVlc1xuICogQHBhcmFtIE51bWJlciB7ZW19IC0gbnVtYmVyIG9mIGVtJ3MgdG8gY2FsY3VsYXRlIGludG8gcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIGVtQ2FsYyhlbSkge1xuICByZXR1cm4gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgbnVsbCkuZm9udFNpemUsIDEwKSAqIGVtO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU3RpY2t5LCAnU3RpY2t5Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUYWJzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50YWJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgdGFicyBjb250YWluIGltYWdlc1xuICovXG5cbmNsYXNzIFRhYnMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiB0YWJzLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRhYnMjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIHRhYnMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVGFicy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RhYnMnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdUYWJzJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICAvLyAnVEFCJzogJ25leHQnLFxuICAgICAgLy8gJ1NISUZUX1RBQic6ICdwcmV2aW91cydcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFicyBieSBzaG93aW5nIGFuZCBmb2N1c2luZyAoaWYgYXV0b0ZvY3VzPXRydWUpIHRoZSBwcmVzZXQgYWN0aXZlIHRhYi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG4gICAgdGhpcy4kdGFiQ29udGVudCA9ICQoYFtkYXRhLXRhYnMtY29udGVudD1cIiR7dGhpcy4kZWxlbWVudFswXS5pZH1cIl1gKTtcblxuICAgIHRoaXMuJHRhYlRpdGxlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRsaW5rID0gJGVsZW0uZmluZCgnYScpLFxuICAgICAgICAgIGlzQWN0aXZlID0gJGVsZW0uaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpLFxuICAgICAgICAgIGhhc2ggPSAkbGlua1swXS5oYXNoLnNsaWNlKDEpLFxuICAgICAgICAgIGxpbmtJZCA9ICRsaW5rWzBdLmlkID8gJGxpbmtbMF0uaWQgOiBgJHtoYXNofS1sYWJlbGAsXG4gICAgICAgICAgJHRhYkNvbnRlbnQgPSAkKGAjJHtoYXNofWApO1xuXG4gICAgICAkZWxlbS5hdHRyKHsncm9sZSc6ICdwcmVzZW50YXRpb24nfSk7XG5cbiAgICAgICRsaW5rLmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnYXJpYS1jb250cm9scyc6IGhhc2gsXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgICR0YWJDb250ZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgIGlmKGlzQWN0aXZlICYmIF90aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcbiAgICAgICAgJGxpbmsuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xuICAgICAgdmFyICRpbWFnZXMgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoJ2ltZycpO1xuXG4gICAgICBpZiAoJGltYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCgkaW1hZ2VzLCB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zZXRIZWlnaHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuX2FkZEtleUhhbmRsZXIoKTtcbiAgICB0aGlzLl9hZGRDbGlja0hhbmRsZXIoKTtcbiAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSBudWxsO1xuICAgIFxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpO1xuICAgICAgXG4gICAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgY2xpY2sgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRDbGlja0hhbmRsZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJ2NsaWNrLnpmLnRhYnMnKVxuICAgICAgLm9uKCdjbGljay56Zi50YWJzJywgYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCwgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKCQodGhpcykuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWJvYXJkIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkS2V5SGFuZGxlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkZmlyc3RUYWIgPSBfdGhpcy4kZWxlbWVudC5maW5kKCdsaTpmaXJzdC1vZi10eXBlJyk7XG4gICAgdmFyICRsYXN0VGFiID0gX3RoaXMuJGVsZW1lbnQuZmluZCgnbGk6bGFzdC1vZi10eXBlJyk7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMub2ZmKCdrZXlkb3duLnpmLnRhYnMnKS5vbigna2V5ZG93bi56Zi50YWJzJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZiAoZS53aGljaCA9PT0gOSkgcmV0dXJuO1xuICAgICAgXG5cbiAgICAgIHZhciAkZWxlbWVudCA9ICQodGhpcyksXG4gICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAkbmV4dEVsZW1lbnQ7XG5cbiAgICAgICRlbGVtZW50cy5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgaWYgKCQodGhpcykuaXMoJGVsZW1lbnQpKSB7XG4gICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMud3JhcE9uS2V5cykge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gaSA9PT0gMCA/ICRlbGVtZW50cy5sYXN0KCkgOiAkZWxlbWVudHMuZXEoaS0xKTtcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9IGkgPT09ICRlbGVtZW50cy5sZW5ndGggLTEgPyAkZWxlbWVudHMuZmlyc3QoKSA6ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5taW4oaSsxLCAkZWxlbWVudHMubGVuZ3RoLTEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gaGFuZGxlIGtleWJvYXJkIGV2ZW50IHdpdGgga2V5Ym9hcmQgdXRpbFxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ1RhYnMnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRlbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRlbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgcHJldmlvdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkcHJldkVsZW1lbnQpO1xuICAgICAgICB9LFxuICAgICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJG5leHRFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSB0YWIgYCR0YXJnZXRDb250ZW50YCBkZWZpbmVkIGJ5IGAkdGFyZ2V0YC5cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSBUYWIgdG8gb3Blbi5cbiAgICogQGZpcmVzIFRhYnMjY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX2hhbmRsZVRhYkNoYW5nZSgkdGFyZ2V0KSB7XG4gICAgdmFyICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICBoYXNoID0gJHRhYkxpbmtbMF0uaGFzaCxcbiAgICAgICAgJHRhcmdldENvbnRlbnQgPSB0aGlzLiR0YWJDb250ZW50LmZpbmQoaGFzaCksXG4gICAgICAgICRvbGRUYWIgPSB0aGlzLiRlbGVtZW50LlxuICAgICAgICAgIGZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9LmlzLWFjdGl2ZWApXG4gICAgICAgICAgLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgICAgIC5maW5kKCdbcm9sZT1cInRhYlwiXScpXG4gICAgICAgICAgLmF0dHIoeyAnYXJpYS1zZWxlY3RlZCc6ICdmYWxzZScgfSk7XG5cbiAgICAkKGAjJHskb2xkVGFiLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKVxuICAgICAgLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgLmF0dHIoeyAnYXJpYS1oaWRkZW4nOiAndHJ1ZScgfSk7XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICR0YWJMaW5rLmF0dHIoeydhcmlhLXNlbGVjdGVkJzogJ3RydWUnfSk7XG5cbiAgICAkdGFyZ2V0Q29udGVudFxuICAgICAgLmFkZENsYXNzKCdpcy1hY3RpdmUnKVxuICAgICAgLmF0dHIoeydhcmlhLWhpZGRlbic6ICdmYWxzZSd9KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgc3VjY2Vzc2Z1bGx5IGNoYW5nZWQgdGFicy5cbiAgICAgKiBAZXZlbnQgVGFicyNjaGFuZ2VcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2NoYW5nZS56Zi50YWJzJywgWyR0YXJnZXRdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciBzZWxlY3RpbmcgYSBjb250ZW50IHBhbmUgdG8gZGlzcGxheS5cbiAgICogQHBhcmFtIHtqUXVlcnkgfCBTdHJpbmd9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IG9yIHN0cmluZyBvZiB0aGUgaWQgb2YgdGhlIHBhbmUgdG8gZGlzcGxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzZWxlY3RUYWIoZWxlbSkge1xuICAgIHZhciBpZFN0cjtcblxuICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlkU3RyID0gZWxlbVswXS5pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWRTdHIgPSBlbGVtO1xuICAgIH1cblxuICAgIGlmIChpZFN0ci5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICBpZFN0ciA9IGAjJHtpZFN0cn1gO1xuICAgIH1cblxuICAgIHZhciAkdGFyZ2V0ID0gdGhpcy4kdGFiVGl0bGVzLmZpbmQoYFtocmVmPVwiJHtpZFN0cn1cIl1gKS5wYXJlbnQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG5cbiAgICB0aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCk7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxuICAgKiBJZiBlbmFibGVkIGluIG9wdGlvbnMsIGdldHMgY2FsbGVkIG9uIG1lZGlhIHF1ZXJ5IGNoYW5nZS5cbiAgICogSWYgbG9hZGluZyBjb250ZW50IHZpYSBleHRlcm5hbCBzb3VyY2UsIGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkgb3Igd2l0aCBfcmVmbG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRIZWlnaHQoKSB7XG4gICAgdmFyIG1heCA9IDA7XG4gICAgdGhpcy4kdGFiQ29udGVudFxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXG4gICAgICAuY3NzKCdoZWlnaHQnLCAnJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGFuZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgaXNBY3RpdmUgPSBwYW5lbC5oYXNDbGFzcygnaXMtYWN0aXZlJyk7XG5cbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7J3Zpc2liaWxpdHknOiAnaGlkZGVuJywgJ2Rpc3BsYXknOiAnYmxvY2snfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdGVtcCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuXG4gICAgICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgICAgICBwYW5lbC5jc3Moe1xuICAgICAgICAgICAgJ3Zpc2liaWxpdHknOiAnJyxcbiAgICAgICAgICAgICdkaXNwbGF5JzogJydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1heCA9IHRlbXAgPiBtYXggPyB0ZW1wIDogbWF4O1xuICAgICAgfSlcbiAgICAgIC5jc3MoJ2hlaWdodCcsIGAke21heH1weGApO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIHRhYnMuXG4gICAqIEBmaXJlcyBUYWJzI2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuZmluZChgLiR7dGhpcy5vcHRpb25zLmxpbmtDbGFzc31gKVxuICAgICAgLm9mZignLnpmLnRhYnMnKS5oaWRlKCkuZW5kKClcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMucGFuZWxDbGFzc31gKVxuICAgICAgLmhpZGUoKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubWF0Y2hIZWlnaHQpIHtcbiAgICAgIGlmICh0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgIT0gbnVsbCkge1xuICAgICAgICAgJCh3aW5kb3cpLm9mZignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgdGhpcy5fc2V0SGVpZ2h0TXFIYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuVGFicy5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgd2luZG93IHRvIHNjcm9sbCB0byBjb250ZW50IG9mIGFjdGl2ZSBwYW5lIG9uIGxvYWQgaWYgc2V0IHRvIHRydWUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBrZXlib2FyZCBpbnB1dCB0byAnd3JhcCcgYXJvdW5kIHRoZSB0YWIgbGlua3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgd3JhcE9uS2V5czogdHJ1ZSxcblxuICAvKipcbiAgICogQWxsb3dzIHRoZSB0YWIgY29udGVudCBwYW5lcyB0byBtYXRjaCBoZWlnaHRzIGlmIHNldCB0byB0cnVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtYXRjaEhlaWdodDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gYGxpYCdzIGluIHRhYiBsaW5rIGxpc3QuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RhYnMtdGl0bGUnXG4gICAqL1xuICBsaW5rQ2xhc3M6ICd0YWJzLXRpdGxlJyxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgY29udGVudCBjb250YWluZXJzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0YWJzLXBhbmVsJ1xuICAgKi9cbiAgcGFuZWxDbGFzczogJ3RhYnMtcGFuZWwnXG59O1xuXG5mdW5jdGlvbiBjaGVja0NsYXNzKCRlbGVtKXtcbiAgcmV0dXJuICRlbGVtLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbn1cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRhYnMsICdUYWJzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb2dnbGVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b2dnbGVyXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICovXG5cbmNsYXNzIFRvZ2dsZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBUb2dnbGVyLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRvZ2dsZXIjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFRvZ2dsZXIuZGVmYXVsdHMsIGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLmNsYXNzTmFtZSA9ICcnO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9nZ2xlcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBUb2dnbGVyIHBsdWdpbiBieSBwYXJzaW5nIHRoZSB0b2dnbGUgY2xhc3MgZnJvbSBkYXRhLXRvZ2dsZXIsIG9yIGFuaW1hdGlvbiBjbGFzc2VzIGZyb20gZGF0YS1hbmltYXRlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBpbnB1dDtcbiAgICAvLyBQYXJzZSBhbmltYXRpb24gY2xhc3NlcyBpZiB0aGV5IHdlcmUgc2V0XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICBpbnB1dCA9IHRoaXMub3B0aW9ucy5hbmltYXRlLnNwbGl0KCcgJyk7XG5cbiAgICAgIHRoaXMuYW5pbWF0aW9uSW4gPSBpbnB1dFswXTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uT3V0ID0gaW5wdXRbMV0gfHwgbnVsbDtcbiAgICB9XG4gICAgLy8gT3RoZXJ3aXNlLCBwYXJzZSB0b2dnbGUgY2xhc3NcbiAgICBlbHNlIHtcbiAgICAgIGlucHV0ID0gdGhpcy4kZWxlbWVudC5kYXRhKCd0b2dnbGVyJyk7XG4gICAgICAvLyBBbGxvdyBmb3IgYSAuIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHN0cmluZ1xuICAgICAgdGhpcy5jbGFzc05hbWUgPSBpbnB1dFswXSA9PT0gJy4nID8gaW5wdXQuc2xpY2UoMSkgOiBpbnB1dDtcbiAgICB9XG5cbiAgICAvLyBBZGQgQVJJQSBhdHRyaWJ1dGVzIHRvIHRyaWdnZXJzXG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZDtcbiAgICAkKGBbZGF0YS1vcGVuPVwiJHtpZH1cIl0sIFtkYXRhLWNsb3NlPVwiJHtpZH1cIl0sIFtkYXRhLXRvZ2dsZT1cIiR7aWR9XCJdYClcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xuICAgIC8vIElmIHRoZSB0YXJnZXQgaXMgaGlkZGVuLCBhZGQgYXJpYS1oaWRkZW5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCB0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykgPyBmYWxzZSA6IHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgdGhlIHRvZ2dsZSB0cmlnZ2VyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJ3RvZ2dsZS56Zi50cmlnZ2VyJykub24oJ3RvZ2dsZS56Zi50cmlnZ2VyJywgdGhpcy50b2dnbGUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgdGFyZ2V0IGNsYXNzIG9uIHRoZSB0YXJnZXQgZWxlbWVudC4gQW4gZXZlbnQgaXMgZmlyZWQgZnJvbSB0aGUgb3JpZ2luYWwgdHJpZ2dlciBkZXBlbmRpbmcgb24gaWYgdGhlIHJlc3VsdGFudCBzdGF0ZSB3YXMgXCJvblwiIG9yIFwib2ZmXCIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvblxuICAgKiBAZmlyZXMgVG9nZ2xlciNvZmZcbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICB0aGlzWyB0aGlzLm9wdGlvbnMuYW5pbWF0ZSA/ICdfdG9nZ2xlQW5pbWF0ZScgOiAnX3RvZ2dsZUNsYXNzJ10oKTtcbiAgfVxuXG4gIF90b2dnbGVDbGFzcygpIHtcbiAgICB0aGlzLiRlbGVtZW50LnRvZ2dsZUNsYXNzKHRoaXMuY2xhc3NOYW1lKTtcblxuICAgIHZhciBpc09uID0gdGhpcy4kZWxlbWVudC5oYXNDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XG4gICAgaWYgKGlzT24pIHtcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgaWYgdGhlIHRhcmdldCBlbGVtZW50IGhhcyB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvblxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIHRoZSB0YXJnZXQgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBjbGFzcyBhZnRlciBhIHRvZ2dsZS5cbiAgICAgICAqIEBldmVudCBUb2dnbGVyI29mZlxuICAgICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29mZi56Zi50b2dnbGVyJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlQVJJQShpc09uKTtcbiAgfVxuXG4gIF90b2dnbGVBbmltYXRlKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpKSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25JbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLl91cGRhdGVBUklBKHRydWUpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29uLnpmLnRvZ2dsZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVPdXQodGhpcy4kZWxlbWVudCwgdGhpcy5hbmltYXRpb25PdXQsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fdXBkYXRlQVJJQShmYWxzZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb2ZmLnpmLnRvZ2dsZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF91cGRhdGVBUklBKGlzT24pIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBpc09uID8gdHJ1ZSA6IGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgVG9nZ2xlciBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudG9nZ2xlcicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ub2dnbGVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGVsbHMgdGhlIHBsdWdpbiBpZiB0aGUgZWxlbWVudCBzaG91bGQgYW5pbWF0ZWQgd2hlbiB0b2dnbGVkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbmltYXRlOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRvZ2dsZXIsICdUb2dnbGVyJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb29sdGlwIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b29sdGlwXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9vbHRpcCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgVG9vbHRpcC5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBUb29sdGlwI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCBhIHRvb2x0aXAgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb2JqZWN0IHRvIGV4dGVuZCB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUb29sdGlwLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0b29sdGlwIGJ5IHNldHRpbmcgdGhlIGNyZWF0aW5nIHRoZSB0aXAgZWxlbWVudCwgYWRkaW5nIGl0J3MgdGV4dCwgc2V0dGluZyBwcml2YXRlIHZhcmlhYmxlcyBhbmQgc2V0dGluZyBhdHRyaWJ1dGVzIG9uIHRoZSBhbmNob3IuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZWxlbUlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWRlc2NyaWJlZGJ5JykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAndG9vbHRpcCcpO1xuXG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyB8fCB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMuJGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucy50aXBUZXh0ID0gdGhpcy5vcHRpb25zLnRpcFRleHQgfHwgdGhpcy4kZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0aGlzLm9wdGlvbnMudGVtcGxhdGUgPyAkKHRoaXMub3B0aW9ucy50ZW1wbGF0ZSkgOiB0aGlzLl9idWlsZFRlbXBsYXRlKGVsZW1JZCk7XG5cbiAgICB0aGlzLnRlbXBsYXRlLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpXG4gICAgICAgIC50ZXh0KHRoaXMub3B0aW9ucy50aXBUZXh0KVxuICAgICAgICAuaGlkZSgpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICd0aXRsZSc6ICcnLFxuICAgICAgJ2FyaWEtZGVzY3JpYmVkYnknOiBlbGVtSWQsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6IGVsZW1JZCxcbiAgICAgICdkYXRhLXRvZ2dsZSc6IGVsZW1JZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6IGVsZW1JZFxuICAgIH0pLmFkZENsYXNzKHRoaXMub3B0aW9ucy50cmlnZ2VyQ2xhc3MpO1xuXG4gICAgLy9oZWxwZXIgdmFyaWFibGVzIHRvIHRyYWNrIG1vdmVtZW50IG9uIGNvbGxpc2lvbnNcbiAgICB0aGlzLnVzZWRQb3NpdGlvbnMgPSBbXTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHcmFicyB0aGUgY3VycmVudCBwb3NpdGlvbmluZyBjbGFzcywgaWYgcHJlc2VudCwgYW5kIHJldHVybnMgdGhlIHZhbHVlIG9yIGFuIGVtcHR5IHN0cmluZy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9nZXRQb3NpdGlvbkNsYXNzKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHsgcmV0dXJuICcnOyB9XG4gICAgLy8gdmFyIHBvc2l0aW9uID0gZWxlbWVudC5hdHRyKCdjbGFzcycpLm1hdGNoKC90b3B8bGVmdHxyaWdodC9nKTtcbiAgICB2YXIgcG9zaXRpb24gPSBlbGVtZW50WzBdLmNsYXNzTmFtZS5tYXRjaCgvXFxiKHRvcHxsZWZ0fHJpZ2h0KVxcYi9nKTtcbiAgICAgICAgcG9zaXRpb24gPSBwb3NpdGlvbiA/IHBvc2l0aW9uWzBdIDogJyc7XG4gICAgcmV0dXJuIHBvc2l0aW9uO1xuICB9O1xuICAvKipcbiAgICogYnVpbGRzIHRoZSB0b29sdGlwIGVsZW1lbnQsIGFkZHMgYXR0cmlidXRlcywgYW5kIHJldHVybnMgdGhlIHRlbXBsYXRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2J1aWxkVGVtcGxhdGUoaWQpIHtcbiAgICB2YXIgdGVtcGxhdGVDbGFzc2VzID0gKGAke3RoaXMub3B0aW9ucy50b29sdGlwQ2xhc3N9ICR7dGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3N9ICR7dGhpcy5vcHRpb25zLnRlbXBsYXRlQ2xhc3Nlc31gKS50cmltKCk7XG4gICAgdmFyICR0ZW1wbGF0ZSA9ICAkKCc8ZGl2PjwvZGl2PicpLmFkZENsYXNzKHRlbXBsYXRlQ2xhc3NlcykuYXR0cih7XG4gICAgICAncm9sZSc6ICd0b29sdGlwJyxcbiAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAnZGF0YS1pcy1hY3RpdmUnOiBmYWxzZSxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnaWQnOiBpZFxuICAgIH0pO1xuICAgIHJldHVybiAkdGVtcGxhdGU7XG4gIH1cblxuICAvKipcbiAgICogRnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gcG9zaXRpb25pbmcgY2xhc3MgdG8gdHJ5XG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG5cbiAgICAvL2RlZmF1bHQsIHRyeSBzd2l0Y2hpbmcgdG8gb3Bwb3NpdGUgc2lkZVxuICAgIGlmICghcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLmFkZENsYXNzKCd0b3AnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH1cblxuICAgIC8vaWYgZGVmYXVsdCBjaGFuZ2UgZGlkbid0IHdvcmssIHRyeSBib3R0b20gb3IgbGVmdCBmaXJzdFxuICAgIGVsc2UgaWYgKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICB0aGlzLmNsYXNzQ2hhbmdlZCA9IHRydWU7XG4gICAgdGhpcy5jb3VudGVyLS07XG4gIH1cblxuICAvKipcbiAgICogc2V0cyB0aGUgcG9zaXRpb24gY2xhc3Mgb2YgYW4gZWxlbWVudCBhbmQgcmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIHVudGlsIHRoZXJlIGFyZSBubyBtb3JlIHBvc3NpYmxlIHBvc2l0aW9ucyB0byBhdHRlbXB0LCBvciB0aGUgdG9vbHRpcCBlbGVtZW50IGlzIG5vIGxvbmdlciBjb2xsaWRpbmcuXG4gICAqIGlmIHRoZSB0b29sdGlwIGlzIGxhcmdlciB0aGFuIHRoZSBzY3JlZW4gd2lkdGgsIGRlZmF1bHQgdG8gZnVsbCB3aWR0aCAtIGFueSB1c2VyIHNlbGVjdGVkIG1hcmdpblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFBvc2l0aW9uKCkge1xuICAgIHZhciBwb3NpdGlvbiA9IHRoaXMuX2dldFBvc2l0aW9uQ2xhc3ModGhpcy50ZW1wbGF0ZSksXG4gICAgICAgICR0aXBEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLnRlbXBsYXRlKSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGVsZW1lbnQpLFxuICAgICAgICBkaXJlY3Rpb24gPSAocG9zaXRpb24gPT09ICdsZWZ0JyA/ICdsZWZ0JyA6ICgocG9zaXRpb24gPT09ICdyaWdodCcpID8gJ2xlZnQnIDogJ3RvcCcpKSxcbiAgICAgICAgcGFyYW0gPSAoZGlyZWN0aW9uID09PSAndG9wJykgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIG9mZnNldCA9IChwYXJhbSA9PT0gJ2hlaWdodCcpID8gdGhpcy5vcHRpb25zLnZPZmZzZXQgOiB0aGlzLm9wdGlvbnMuaE9mZnNldCxcbiAgICAgICAgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKCgkdGlwRGltcy53aWR0aCA+PSAkdGlwRGltcy53aW5kb3dEaW1zLndpZHRoKSB8fCAoIXRoaXMuY291bnRlciAmJiAhRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLnRlbXBsYXRlKSkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgLy8gdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0LCB0cnVlKSkuY3NzKHtcbiAgICAgICAgJ3dpZHRoJzogJGFuY2hvckRpbXMud2luZG93RGltcy53aWR0aCAtICh0aGlzLm9wdGlvbnMuaE9mZnNldCAqIDIpLFxuICAgICAgICAnaGVpZ2h0JzogJ2F1dG8nXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnRlbXBsYXRlLm9mZnNldChGb3VuZGF0aW9uLkJveC5HZXRPZmZzZXRzKHRoaXMudGVtcGxhdGUsIHRoaXMuJGVsZW1lbnQsJ2NlbnRlciAnICsgKHBvc2l0aW9uIHx8ICdib3R0b20nKSwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLnRlbXBsYXRlKSAmJiB0aGlzLmNvdW50ZXIpIHtcbiAgICAgIHRoaXMuX3JlcG9zaXRpb24ocG9zaXRpb24pO1xuICAgICAgdGhpcy5fc2V0UG9zaXRpb24oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogcmV2ZWFscyB0aGUgdG9vbHRpcCwgYW5kIGZpcmVzIGFuIGV2ZW50IHRvIGNsb3NlIGFueSBvdGhlciBvcGVuIHRvb2x0aXBzIG9uIHRoZSBwYWdlXG4gICAqIEBmaXJlcyBUb29sdGlwI2Nsb3NlbWVcbiAgICogQGZpcmVzIFRvb2x0aXAjc2hvd1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNob3coKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaG93T24gIT09ICdhbGwnICYmICFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuc2hvd09uKSkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcignVGhlIHNjcmVlbiBpcyB0b28gc21hbGwgdG8gZGlzcGxheSB0aGlzIHRvb2x0aXAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLnNob3coKTtcbiAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgdG8gY2xvc2UgYWxsIG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcbiAgICAgKiBAZXZlbnQgQ2xvc2VtZSN0b29sdGlwXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnRvb2x0aXAnLCB0aGlzLnRlbXBsYXRlLmF0dHIoJ2lkJykpO1xuXG5cbiAgICB0aGlzLnRlbXBsYXRlLmF0dHIoe1xuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogdHJ1ZSxcbiAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlXG4gICAgfSk7XG4gICAgX3RoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudGVtcGxhdGUpO1xuICAgIHRoaXMudGVtcGxhdGUuc3RvcCgpLmhpZGUoKS5jc3MoJ3Zpc2liaWxpdHknLCAnJykuZmFkZUluKHRoaXMub3B0aW9ucy5mYWRlSW5EdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAvL21heWJlIGRvIHN0dWZmP1xuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHRvb2x0aXAgaXMgc2hvd25cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyB0aGUgY3VycmVudCB0b29sdGlwLCBhbmQgcmVzZXRzIHRoZSBwb3NpdGlvbmluZyBjbGFzcyBpZiBpdCB3YXMgY2hhbmdlZCBkdWUgdG8gY29sbGlzaW9uXG4gICAqIEBmaXJlcyBUb29sdGlwI2hpZGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBoaWRlKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdoaWRpbmcnLCB0aGlzLiRlbGVtZW50LmRhdGEoJ3lldGktYm94JykpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2VcbiAgICB9KS5mYWRlT3V0KHRoaXMub3B0aW9ucy5mYWRlT3V0RHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgIGlmIChfdGhpcy5jbGFzc0NoYW5nZWQpIHtcbiAgICAgICAgX3RoaXMudGVtcGxhdGVcbiAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoX3RoaXMuX2dldFBvc2l0aW9uQ2xhc3MoX3RoaXMudGVtcGxhdGUpKVxuICAgICAgICAgICAgIC5hZGRDbGFzcyhfdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MpO1xuXG4gICAgICAgX3RoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgICAgIF90aGlzLmNvdW50ZXIgPSA0O1xuICAgICAgIF90aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIGZpcmVzIHdoZW4gdGhlIHRvb2x0aXAgaXMgaGlkZGVuXG4gICAgICogQGV2ZW50IFRvb2x0aXAjaGlkZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi50b29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogYWRkcyBldmVudCBsaXN0ZW5lcnMgZm9yIHRoZSB0b29sdGlwIGFuZCBpdHMgYW5jaG9yXG4gICAqIFRPRE8gY29tYmluZSBzb21lIG9mIHRoZSBsaXN0ZW5lcnMgbGlrZSBmb2N1cyBhbmQgbW91c2VlbnRlciwgZXRjLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlO1xuICAgIHZhciBpc0ZvY3VzID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcblxuICAgICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmICghX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCdtb3VzZWxlYXZlLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgaWYgKCFpc0ZvY3VzIHx8IChfdGhpcy5pc0NsaWNrICYmICFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikpIHtcbiAgICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcbiAgICAgICAgICAvL190aGlzLmhpZGUoKTtcbiAgICAgICAgICAvLyBfdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICAgICAgaWYgKChfdGhpcy5vcHRpb25zLmRpc2FibGVIb3ZlciB8fCAhX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKSkgJiYgIV90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBfdGhpcy5zaG93KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2Vkb3duLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUZvclRvdWNoKSB7XG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ3RhcC56Zi50b29sdGlwIHRvdWNoZW5kLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIF90aGlzLmlzQWN0aXZlID8gX3RoaXMuaGlkZSgpIDogX3RoaXMuc2hvdygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAvLyAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgLy8gJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCdmb2N1cy56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpc0ZvY3VzID0gdHJ1ZTtcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcbiAgICAgICAgICAvLyBJZiB3ZSdyZSBub3Qgc2hvd2luZyBvcGVuIG9uIGNsaWNrcywgd2UgbmVlZCB0byBwcmV0ZW5kIGEgY2xpY2stbGF1bmNoZWQgZm9jdXMgaXNuJ3RcbiAgICAgICAgICAvLyBhIHJlYWwgZm9jdXMsIG90aGVyd2lzZSBvbiBob3ZlciBhbmQgY29tZSBiYWNrIHdlIGdldCBiYWQgYmVoYXZpb3JcbiAgICAgICAgICBpZighX3RoaXMub3B0aW9ucy5jbGlja09wZW4pIHsgaXNGb2N1cyA9IGZhbHNlOyB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLm9uKCdmb2N1c291dC56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpc0ZvY3VzID0gZmFsc2U7XG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaGlkZSgpO1xuICAgICAgfSlcblxuICAgICAgLm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGEgdG9nZ2xlIG1ldGhvZCwgaW4gYWRkaXRpb24gdG8gdGhlIHN0YXRpYyBzaG93KCkgJiBoaWRlKCkgZnVuY3Rpb25zXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmhpZGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIHRvb2x0aXAsIHJlbW92ZXMgdGVtcGxhdGUgZWxlbWVudCBmcm9tIHRoZSB2aWV3LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCd0aXRsZScsIHRoaXMudGVtcGxhdGUudGV4dCgpKVxuICAgICAgICAgICAgICAgICAub2ZmKCcuemYudHJpZ2dlciAuemYudG9vdGlwJylcbiAgICAgICAgICAgICAgICAvLyAgLnJlbW92ZUNsYXNzKCdoYXMtdGlwJylcbiAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtZGVzY3JpYmVkYnknKVxuICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS15ZXRpLWJveCcpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvZ2dsZScpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXJlc2l6ZScpO1xuXG4gICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmUoKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ub29sdGlwLmRlZmF1bHRzID0ge1xuICBkaXNhYmxlRm9yVG91Y2g6IGZhbHNlLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGJlZm9yZSBhIHRvb2x0aXAgc2hvdWxkIG9wZW4gb24gaG92ZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjAwXG4gICAqL1xuICBob3ZlckRlbGF5OiAyMDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYSB0b29sdGlwIHNob3VsZCB0YWtlIHRvIGZhZGUgaW50byB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDE1MFxuICAgKi9cbiAgZmFkZUluRHVyYXRpb246IDE1MCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBhIHRvb2x0aXAgc2hvdWxkIHRha2UgdG8gZmFkZSBvdXQgb2Ygdmlldy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxNTBcbiAgICovXG4gIGZhZGVPdXREdXJhdGlvbjogMTUwLFxuICAvKipcbiAgICogRGlzYWJsZXMgaG92ZXIgZXZlbnRzIGZyb20gb3BlbmluZyB0aGUgdG9vbHRpcCBpZiBzZXQgdG8gdHJ1ZVxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkaXNhYmxlSG92ZXI6IGZhbHNlLFxuICAvKipcbiAgICogT3B0aW9uYWwgYWRkdGlvbmFsIGNsYXNzZXMgdG8gYXBwbHkgdG8gdGhlIHRvb2x0aXAgdGVtcGxhdGUgb24gaW5pdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbXktY29vbC10aXAtY2xhc3MnXG4gICAqL1xuICB0ZW1wbGF0ZUNsYXNzZXM6ICcnLFxuICAvKipcbiAgICogTm9uLW9wdGlvbmFsIGNsYXNzIGFkZGVkIHRvIHRvb2x0aXAgdGVtcGxhdGVzLiBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgJ3Rvb2x0aXAnLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICd0b29sdGlwJ1xuICAgKi9cbiAgdG9vbHRpcENsYXNzOiAndG9vbHRpcCcsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSB0b29sdGlwIGFuY2hvciBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdoYXMtdGlwJ1xuICAgKi9cbiAgdHJpZ2dlckNsYXNzOiAnaGFzLXRpcCcsXG4gIC8qKlxuICAgKiBNaW5pbXVtIGJyZWFrcG9pbnQgc2l6ZSBhdCB3aGljaCB0byBvcGVuIHRoZSB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbWFsbCdcbiAgICovXG4gIHNob3dPbjogJ3NtYWxsJyxcbiAgLyoqXG4gICAqIEN1c3RvbSB0ZW1wbGF0ZSB0byBiZSB1c2VkIHRvIGdlbmVyYXRlIG1hcmt1cCBmb3IgdG9vbHRpcC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnJmx0O2RpdiBjbGFzcz1cInRvb2x0aXBcIiZndDsmbHQ7L2RpdiZndDsnXG4gICAqL1xuICB0ZW1wbGF0ZTogJycsXG4gIC8qKlxuICAgKiBUZXh0IGRpc3BsYXllZCBpbiB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdTb21lIGNvb2wgc3BhY2UgZmFjdCBoZXJlLidcbiAgICovXG4gIHRpcFRleHQ6ICcnLFxuICB0b3VjaENsb3NlVGV4dDogJ1RhcCB0byBjbG9zZS4nLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB0b29sdGlwIHRvIHJlbWFpbiBvcGVuIGlmIHRyaWdnZXJlZCB3aXRoIGEgY2xpY2sgb3IgdG91Y2ggZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiB0cnVlLFxuICAvKipcbiAgICogQWRkaXRpb25hbCBwb3NpdGlvbmluZyBjbGFzc2VzLCBzZXQgYnkgdGhlIEpTXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBZIGF4aXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIHZPZmZzZXQ6IDEwLFxuICAvKipcbiAgICogRGlzdGFuY2UsIGluIHBpeGVscywgdGhlIHRlbXBsYXRlIHNob3VsZCBwdXNoIGF3YXkgZnJvbSB0aGUgYW5jaG9yIG9uIHRoZSBYIGF4aXMsIGlmIGFsaWduZWQgdG8gYSBzaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDEyXG4gICAqL1xuICBoT2Zmc2V0OiAxMlxufTtcblxuLyoqXG4gKiBUT0RPIHV0aWxpemUgcmVzaXplIGV2ZW50IHRyaWdnZXJcbiAqL1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oVG9vbHRpcCwgJ1Rvb2x0aXAnKTtcblxufShqUXVlcnkpOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93KVxuICAgIERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxufSkoKTtcblxudmFyIGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbnZhciBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcblxuLy8gRmluZCB0aGUgcmlnaHQgXCJ0cmFuc2l0aW9uZW5kXCIgZXZlbnQgZm9yIHRoaXMgYnJvd3NlclxudmFyIGVuZEV2ZW50ID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICB9XG4gIHZhciBlbGVtID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJhbnNpdGlvbnNbdF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59KSgpO1xuXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIGlmIChlbmRFdmVudCA9PT0gbnVsbCkge1xuICAgIGlzSW4gPyBlbGVtZW50LnNob3coKSA6IGVsZW1lbnQuaGlkZSgpO1xuICAgIGNiKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcbiAgZWxlbWVudC5hZGRDbGFzcyhhbmltYXRpb24pO1xuICBlbGVtZW50LmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJycpO1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoJ3RyYW5zaXRpb25lbmQnLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGluaXRDbGFzcyArICcgJyArIGFjdGl2ZUNsYXNzICsgJyAnICsgYW5pbWF0aW9uKTtcbiAgfVxufVxuXG52YXIgTW90aW9uVUkgPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG4iLCJqUXVlcnkoICdpZnJhbWVbc3JjKj1cInlvdXR1YmUuY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbicvPlwiKTtcbmpRdWVyeSggJ2lmcmFtZVtzcmMqPVwidmltZW8uY29tXCJdJykud3JhcChcIjxkaXYgY2xhc3M9J2ZsZXgtdmlkZW8gd2lkZXNjcmVlbiB2aW1lbycvPlwiKTtcbiIsImpRdWVyeShkb2N1bWVudCkuZm91bmRhdGlvbigpO1xuIiwiLy8gSm95cmlkZSBkZW1vXG4kKCcjc3RhcnQtanInKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgJChkb2N1bWVudCkuZm91bmRhdGlvbignam95cmlkZScsJ3N0YXJ0Jyk7XG59KTsiLG51bGwsIlxuJCh3aW5kb3cpLmJpbmQoJyBsb2FkIHJlc2l6ZSBvcmllbnRhdGlvbkNoYW5nZSAnLCBmdW5jdGlvbiAoKSB7XG4gICB2YXIgZm9vdGVyID0gJChcIiNmb290ZXItY29udGFpbmVyXCIpO1xuICAgdmFyIHBvcyA9IGZvb3Rlci5wb3NpdGlvbigpO1xuICAgdmFyIGhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgIGhlaWdodCA9IGhlaWdodCAtIHBvcy50b3A7XG4gICBoZWlnaHQgPSBoZWlnaHQgLSBmb290ZXIuaGVpZ2h0KCkgLTE7XG5cbiAgIGZ1bmN0aW9uIHN0aWNreUZvb3RlcigpIHtcbiAgICAgZm9vdGVyLmNzcyh7XG4gICAgICAgICAnbWFyZ2luLXRvcCc6IGhlaWdodCArICdweCdcbiAgICAgfSk7XG4gICB9XG5cbiAgIGlmIChoZWlnaHQgPiAwKSB7XG4gICAgIHN0aWNreUZvb3RlcigpO1xuICAgfVxufSk7XG4iXX0=
