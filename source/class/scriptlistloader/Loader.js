/**
 * Copyright (c) 2012 Derrell Lipman
 * 
 * License:
 *   LGPL: http://www.gnu.org/licenses/lgpl.html 
 *   EPL : http://www.eclipse.org/org/documents/epl-v10.php
 * 
 * Generic script loader, heavily influenced by by Tobi Oetiker's jqPlot loader.
 */

/*
 * Abstract class for loading a series of JavaScript and CSS files.
 *
 * Example usage:
 *
 * / *
 * #asset(jqPlot/*)
 * * /
 *
 * qx.Class.define("my.jqPlotLoader",
 * {
 *   extend : scriptlistloader.Loader,
 *   type   : "singleton",
 *
 *   construct : function()
 *   {
 *     var jsFiles =
 *       [
 *         "jquery.min.js",
 *         "jquery.jqplot.min.js"
 *       ];
 *
 *     var cssFiles =
 *       [
 *         "jquery.jqplot.min.css"      
 *       ];
 *
 *     this.base(arguments,
 *               qx.lang.Function.bind(this._onLoaded, this),
 *               "resource/jqPlot",
 *               jsFiles,
 *               cssFiles);
 *   },
 *
 *   members :
 *   {
 *     _onLoaded : function(failures)
 *     {
 *       // Ensure that all files loaded properly
 *       if (failures.length > 0)
 *       {
 *         alert("Failed to load files:\n\t" + failures.join("\n\t"));
 *       }
 *       else
 *       {
 *         // All files loaded.
 *       }
 *     }
 *   }
 * });
 * 
 * // Load jqPlot
 * my.jqPlotLoader.getInstance();
 */
qx.Class.define("scriptlistloader.Loader",
{
  extend : qx.core.Object,

  /**
   * Script Loader.
   *
   * @param onAllScriptsProcessed {Function}
   *   Function to be called when all scripts have been processed. The
   *   function will be called with one parameter: an array containing the
   *   fully-resolved names of files which failed to load. If this array is
   *   empty, then all files loaded successfully.
   *
   * @param resourceDir {String?}
   *   The directory in which to find the CSS and JavaScript files to be
   *   loaded. This will typically be something like "resource/packageName"
   *
   * @param jsFiles {Array?}
   *   An array of JavaScript file names to be loaded. The files are expected
   *   to be found in the resource directory specified by resourceDir.
   *
   * @param cssFiles {Array?}
   *   An array of CSS file names to be loaded. The files are expected to be
   *   found in the resource directory specified by resourceDir.
   */
  construct: function(onAllScriptsProcessed, resourceDir, jsFiles, cssFiles)
  {
    this.base(arguments);
    
    // If we were given CSS files to load...
    if (cssFiles)
    {
      // First, ensure we have a unique list of file names.
      cssFiles = qx.lang.Array.unique(cssFiles);
      
      // Now load each CSS file.
      cssFiles.forEach(
        function(cssFile)
        {
          // Prefix this filename with the resource directory, and call our
          // function to load the CSS file.
          this.__addCss((resourceDir ? resourceDir + "/" : "") + cssFile);
        },
        this);
    }

    // If we were given JavaScript files to load...
    if (jsFiles)
    {
      // Ensure we have a unique list of JavaScript file names
      jsFiles = qx.lang.Array.unique(jsFiles);

      // Begin loading of the JavaScript files. Prefix each of the JavaScript
      // files with the resource directory.
      this.__loadScripts(onAllScriptsProcessed, 
                         jsFiles.map(
                           function(jsFile)
                           {
                             return ((resourceDir 
                                      ? resourceDir + "/"
                                      : "") +
                                     jsFile);
                           }));
    }

    // Initialize the map of listeners for scripts current being loaded
    this._loading = {};
    
    // Initialize the count of scripts currently loading
    this._loadingCount = 0;
    
    // Initialize the map of failed loads
    this._failures = [];
  },

  members :
  {
    /** Map of listeners for scripts current being loaded */
    _loading      : null,
    
    /** Count of scripts currently loading */
    _loadingCount : 0,
    
    /** List of failed loads */
    _failures     : null,

    /**
     * Simple css loader
     * 
     * @param url {String}
     *   Unresolved URL. This URL will be passed to the resource manager's
     *   "toUri()" method to be resolved into a fully-qualified URL.
     */
    __addCss: function(url)
    {
      var             head;
      var             el;

      // Retrieve the HEAD element
      head = document.getElementsByTagName("head")[0];

      // Create a new link element and initialize it
      el = document.createElement("link");
      el.type = "text/css";
      el.rel = "stylesheet";

      // Specify the stylesheet file to be loaded
      el.href = qx.util.ResourceManager.getInstance().toUri(url);

      // Begin loading the stylesheet (soon)
      qx.util.TimerManager.getInstance().start(
        function()
        {
          head.appendChild(el);
        });
    },

    /**
     * Progressively load a list of scripts.
     *
     * @param onAllScriptsProcessed {Function}
     *   Function to call when all scripts have been loaded.
     *
     * @param jsFiles {Array}
     *   Array of file filenames (with the resource directory path already
     *   prepended) to be loaded from the server.
     */
    __loadScripts: function(onAllScriptsProcessed, jsFiles)
    {
      var             source;
      var             script;
      var             scriptLoader;
        
      // Attempt to retrieve a script name
      script = jsFiles.shift();
      
      // If there's anything left...
      if (script)
      {
        // Increment the count of loading scripts
        ++this._loadingCount;

        // Obtain a script loader to load this script
        scriptLoader = new qx.io.ScriptLoader();

        // Canonicalize this script name
        source = qx.util.ResourceManager.getInstance().toUri(script);

        // Begin loading this script
        scriptLoader.load(
          source,
          function(status)
          {
            // Did loading succeeed?
            if (status != "success")
            {
              // This one failed to load
              this._failures.push(script);
            }

            // Decrement the count of loading scripts
            --this._loadingCount;
            
            // Check for more files to load
            this.__loadScripts(onAllScriptsProcessed, jsFiles);
          },
          this);
      }
      else if (this._loadingCount <= 0)
      {
        // All scripts are loaded.
        onAllScriptsProcessed && onAllScriptsProcessed(this._failures);
      }
      else
      {
        // Nothing to do right now. There are no more scripts to begin
        // loading, but there are still scripts in the process of
        // loading. When one of them finished loading, we'll be called again
        // to see if all are done.
      }
    }
  }
});
