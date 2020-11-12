(function() {
	tinymce.create('tinymce.plugins.IcePlugin', {

		/**
		 * Tinymce initializtion API for ice. An `ice` object is expected
		 * with any of the following params.
		 */
		deleteTag: 'span',
		insertTag: 'span',
		deleteClass: 'del',
		insertClass: 'ins',
		changeIdAttribute: 'data-cid',
		userIdAttribute: 'data-userid',
		userNameAttribute: 'data-username',
		timeAttribute: 'data-time',
		preserveOnPaste: 'p',
		user: { name: 'Unknown User', id: Math.random() },
		isTracking: true,
		contentEditable: true,
		css: 'css/ice.css',
		manualInit: false,
		scriptVersion: new Date().getTime(),
		afterInit: function() {},
		afterClean: function(body) { return body; },
		beforePasteClean: function(body) { return body; },
		afterPasteClean: function(body) { return body; },
		titleFormat: null,
		//buttons to activate/deactivate
		trackChangesButton: function () { },
        	showChangesButton: function () { },
        	acceptButton: function () { },
        	rejectButton: function () { },
        	acceptAllButton: function () { },
        	rejectAllButton: function () { },

		/**
		 * Plugin initialization - register buttons, commands, and take care of setup.
		 */
		init: function(ed, url) {
			
			var self = this,
				changeEditor = null;

			
			// make sure only the plugin is handling this event	and not the editor		
			ed.on('keydown', function(e) {
				// prevent the delete key and backspace keys from firing twice
				if((e.keyCode == 46 || e.keyCode == 8) && self.isTracking) {
					e.preventDefault();
			    }
			});
				
			/**
			 * After the editor renders, initialize ice.
			 */
			ed.on('init', function(e) {
				var dom = ed.dom;
				
				tinymce.extend(self, ed.getParam('ice'));
				self.insertSelector = '.' + self.insertClass;
				self.deleteSelector = '.' + self.deleteClass;

				// Add insert and delete tag/attribute rules.
				// Important: keep `id` in attributes list in case `insertTag` is a `span` - tinymce uses temporary spans with ids.
				ed.serializer.addRules(self.insertTag + '[id|class|title|'+self.changeIdAttribute + '|' + self.userIdAttribute + '|' + self.userNameAttribute + '|' + self.timeAttribute + ']');
				ed.serializer.addRules(self.deleteTag + '[id|class|title|'+self.changeIdAttribute + '|' + self.userIdAttribute + '|' + self.userNameAttribute + '|' + self.timeAttribute + ']');
				// Temporary tags to act as placeholders for deletes.
				ed.serializer.addRules('tempdel[data-allocation]');

				dom.loadCSS(self.css.indexOf('://') > 0 ? self.css : (url + '/' + self.css));
				
				/**
				 * TODO/FIXME - Investigate further into why this doesn't work...
				 * 
				tinymce.ScriptLoader.load(url + '/js/ice.min.js', function() {
					ed.execCommand('initializeice');
				});
				 *
				 * Script load manually, instead.
				 */
				var startIce = function() {
					if(!self.manualInit) ed.execCommand('initializeice');
				};
				var script = document.createElement('script');
				script.type = 'text/javascript';
				if (script.readyState) script.onreadystatechange = function() { startIce(); };
				else script.onload = startIce;
				script.src = url + '/js/ice.min.js?version='+self.scriptVersion;
				document.getElementsByTagName('head')[0].appendChild(script);

				// Setting the Show/Hide Changes button to active
				//ed.controlManager.setActive('ice_toggleshowchanges', true);
				//if(self.isTracking)
				//	ed.controlManager.setActive('ice_togglechanges', true);
			});
			
			/**
			 * Instantiates a new ice instance using the given `editor` or the current editor body.
			 * TODO/FIXME: There is some timing conflict that forces us to initialize ice after a
			 * timeout (maybe mce isn't completely initialized???). Research further...
			 */
			ed.addCommand('initializeice', function(editor) {
				ed = editor || ed;
				tinymce.DOM.win.setTimeout(function() {
					changeEditor = new ice.InlineChangeEditor({
						element: ed.getBody(),
						isTracking: self.isTracking,
						contentEditable: self.contentEditable,
						changeIdAttribute: self.changeIdAttribute,
						userIdAttribute: self.userIdAttribute,
						userNameAttribute: self.userNameAttribute,
						timeAttribute: self.timeAttribute,
						currentUser: {
							id: self.user.id,
							name: self.user.name
						},
						plugins: [
							'IceEmdashPlugin',
							'IceAddTitlePlugin',
							'IceSmartQuotesPlugin',
							{
								name: 'IceCopyPastePlugin',
								settings: {
									pasteType: 'formattedClean',
									preserve: self.preserveOnPaste,
									beforePasteClean: self.beforePasteClean,
									afterPasteClean: self.afterPasteClean
								}
							}
						],
						changeTypes: {
							insertType: {tag: self.insertTag, alias: self.insertClass},
							deleteType: {tag: self.deleteTag, alias: self.deleteClass}
						},
						titleFormat: self.titleFormat
					}).startTracking();
					
					
					// since onEvent doesn't seem to exist in TinyMce4 override the events as necessary
					ed.on('mousedown', function(e) {
						return changeEditor.handleEvent(e);
					});
					
					ed.on('keyup', function(e) {
						return changeEditor.handleEvent(e);
					});
					
					ed.on('keydown', function(e) {
						return changeEditor.handleEvent(e);
					});
					
					ed.on('keypress', function(e) {
						return changeEditor.handleEvent(e);
					});
					
					setTimeout(function() { self.afterInit.call(self, changeEditor); }, 10);
				}, 500);
			});
			

            //   _____                                                 _
            //  /  __ \                                               | |
            // | /  \/  ___   _ __ ___   _ __ ___    __ _  _ __    __| |
            // | |     / _ \ | '_ ` _ \ | '_ ` _ \  / _` || '_ \  / _` |
            // | \__/\| (_) || | | | | || | | | | || (_| || | | || (_| |
            // \____/ \___/ |_| |_| |_||_| |_| |_| \__,_||_| |_| \__,_|
            //
            //

			/**
			 * Re-initializes ice's environment - resets the environment variables for the current page
			 * and re-initializes the internal ice range. This is useful after tinymce hides/switches
			 * the current editor, like when toggling to the html source view and back.
			 */
			ed.addCommand('ice_initenv', function() {
				changeEditor.initializeEnvironment();
				changeEditor.initializeRange();
			});
			
			/**
			 * Cleans change tracking tags out of the given, or editor, body. Removes deletes and their
			 * inner contents; removes insert tags, keeping their inner content in place.
			 * @param el optional html string or node body.
			 * @return clean body, void of change tracking tags.
			 */
			ed.addCommand('icecleanbody', function(el) {
				var body = changeEditor.getCleanContent(el || ed.getContent(), self.afterClean, self.beforeClean);
				return body;
			});
			
			/**
			 * Returns true if delete placeholders are in place; otherwise, false.
			 */
			ed.addCommand('ice_hasDeletePlaceholders', function() {
				return changeEditor.isPlaceholdingDeletes;
			});
			
			/**
			 * This command will drop placeholders in place of delete tags in the editor body and
			 * store away the references which can be reverted back with the `ice_removeDeletePlaceholders`.
			 */
			ed.addCommand('ice_addDeletePlaceholders', function() {
				return changeEditor.placeholdDeletes();
			});
			
			/**
			 * Replaces delete placeholders with their respective delete nodes.
			 */
			ed.addCommand('ice_removeDeletePlaceholders', function() {
				return changeEditor.revertDeletePlaceholders();
			});
			
			/**
			 * Insert content with change tracking tags. 
			 * 
			 * The `insert` object parameter can contain the following properties: 
			 *   { `item`, `range` }
			 * Where `item` is the item to insert (string, or textnode)
			 * and `range` is an optional range to insert into.
			 */
			ed.addCommand('iceinsert', function(insert) {
				insert = insert || {};
				changeEditor.insert(insert.item, insert.range);
			});
			
			/**
			 * Deletes content with change tracking tags. 
			 * 
			 * The `del` object parameter can contain the following properties:
			 *   { `right`, `range` }
			 * Where `right` is an optional boolean parameter, where true deletes to the right, false to the left
			 * and `range` is an optional range to delete in.
			 * 
			 * If the current Selection isn't collapsed then the `right` param is ignored 
			 * and a selection delete is performed.
			 */
			ed.addCommand('icedelete', function(del) {
				del = del || {};
				changeEditor.deleteContents(del.right, del.range);
			});

			/**
			 * Set the current ice user with the incoming `user`.
			 */
			ed.addCommand('ice_changeuser', function(ui, user) {
				changeEditor.setCurrentUser(user);
			});

			/**
			 * Uses the given `node` or finds the current node where the selection resides, and in the 
			 * case of a delete tag, removes the node, or in the case of an insert, removes the outer 
			 * insert tag and keeps the contents in place.
			 */
			ed.addCommand('iceaccept', function(node) {
				ed.undoManager.add();
				changeEditor.acceptChange(node || ed.selection.getNode());
				cleanup();
			});
			
			/**
			 * Uses the given `node` or finds the current node where the selection resides, and in the 
			 * case of a delete tag, removes the outer delete tag and keeps the contents in place, or 
			 * in the case of an insert, removes the node.
			 */
			ed.addCommand('icereject', function(node) {
				ed.undoManager.add();
				changeEditor.rejectChange(node || ed.selection.getNode());
				cleanup();
			});
			
			/**
			 * Cleans the editor body of change tags - removes delete nodes, and removes outer insert 
			 * tags keeping the inner content in place. Defers to cleaning technique.
			 */
			ed.addCommand('iceacceptall', function() {
				ed.undoManager.add();
				changeEditor.acceptAll();
				cleanup();
			});
			
			/**
			 * Cleans the editor body of change tags - removes inserts, and removes outer delete tags, 
			 * keeping the inner content in place.
			 */
			ed.addCommand('icerejectall', function() {
				ed.undoManager.add();
				changeEditor.rejectAll();
				cleanup();
			});
			
			/**
			 * Adds a class to the editor body which will toggle, hide or show, track change styling.
			 */
			ed.addCommand('ice_toggleshowchanges', function() {
				var body = ed.getBody(), cm = ed.controlManager, disabled = true;

				if(ed.dom.hasClass(body,'CT-hide')) {
					//activate show changes button
                    ed.plugins.ice.showChangesButton.setActive(true);
					ed.dom.removeClass(body, 'CT-hide');
					disabled = false;
				} else {
					//deactivate show changes button
                    ed.plugins.ice.showChangesButton.setActive(false);
					ed.dom.addClass(body, 'CT-hide');
				}

				//toggle button disabling
                ed.plugins.ice.acceptAllButton.setDisabled(disabled);
                ed.plugins.ice.rejectAllButton.setDisabled(disabled);
                ed.plugins.ice.acceptButton.setDisabled(disabled);
                ed.plugins.ice.rejectButton.setDisabled(disabled);

				ed.execCommand('mceRepaint');
			});

			/**
			 * Calls the ice smart quotes plugin to convert regular quotes to smart quotes.
			 */
			ed.addCommand('ice_smartquotes', function(ui, quiet) {
				changeEditor.pluginsManager.plugins['IceSmartQuotesPlugin'].convert(ed.getBody());
				if (!quiet) ed.windowManager.alert('Regular quotes have been converted into smart quotes.');
			});
			
			/**
			 * Toggle change tracking on or off. Delegates to ice_enable or ice_disable.
			 */
			ed.addCommand('ice_togglechanges', function() {
				if(changeEditor.isTracking) {
					ed.execCommand('ice_disable');
				} else {
					ed.execCommand('ice_enable');
				}
			});
			
			/**
			 * Turns change tracking on - ice will handle incoming key events.
			 */
			ed.addCommand('ice_enable', function() {
				changeEditor.enableChangeTracking();
				//toggle buttons and call show changes
                ed.plugins.ice.trackChangesButton.setActive(true);
                ed.plugins.ice.showChangesButton.setDisabled(false);
                		ed.execCommand('ice_toggleshowchanges');
				self.isTracking = true;
			});
			
			/**
			 * Turns change tracking off - ice will be present but it won't listen
			 * or act on events.
			 */
			ed.addCommand('ice_disable', function() {
				//hide changes and toggle buttons
				var body = ed.getBody();
				ed.dom.addClass(body, 'CT-hide');
                ed.plugins.ice.trackChangesButton.setActive(false);
                ed.plugins.ice.showChangesButton.setActive(false);
                ed.plugins.ice.showChangesButton.setDisabled(true);
                ed.plugins.ice.acceptAllButton.setDisabled(true);
                ed.plugins.ice.rejectAllButton.setDisabled(true);
                ed.plugins.ice.acceptButton.setDisabled(true);
                ed.plugins.ice.rejectButton.setDisabled(true);
				changeEditor.disableChangeTracking();
				self.isTracking = false;
			});
			
			/**
			 * Returns 1 if ice is handling events and tracking changes; otherwise, 0.
			 */
			ed.addCommand('ice_isTracking', function() {
				return changeEditor.isTracking ? 1 : 0;
			});
			
			/**
			 * Calls the copy-paste ice plugin to strip tags and attributes out of the given `html`.
			 */
			ed.addCommand('ice_strippaste', function(html) {
				return changeEditor.pluginsManager.plugins['IceCopyPastePlugin'].stripPaste(html);
			});

			/**
			 * Makes a manual call to the paste handler - this feature is only useful when `isTracking`
			 * is false; otherwise, ice will automatically handle paste events.
			 */
			ed.addCommand('ice_handlepaste', function(html) {
				return changeEditor.pluginsManager.plugins['IceCopyPastePlugin'].handlePaste();
			});

			/**
			 * Makes a manual call to the paste handler - this feature is only useful when `isTracking`
			 * is false; otherwise, ice will automatically handle paste events.
			 */
			ed.addCommand('ice_dopaste', function(ui, html) {
				changeEditor.pluginsManager.plugins['IceCopyPastePlugin'].addContentToPasteDiv(html)
				return changeEditor.pluginsManager.plugins['IceCopyPastePlugin'].handlePasteValue(false);
			});

			/**
			 * Makes a manual call to the emdash handler - this feature is only useful when `isTracking`
			 * is false and the emdash plugin is not on; otherwise, ice will handle emdash conversion.
			 */
			ed.addCommand('ice_handleemdash', function(html) {
				return changeEditor.pluginsManager.plugins['IceEmdashPlugin'].convertEmdash() ? 1 : 0;
			});
			
            //  _____
            // |_   _|
            //  | |    ___   ___   _ __   ___
            //  | |   / __| / _ \ | '_ \ / __|
            // _| |_ | (__ | (_) || | | |\__ \
            // \___/  \___| \___/ |_| |_||___/

			// Icons are now svg only. Either you make a package https://www.tiny.cloud/docs/advanced/creating-an-icon-pack/
			// or you add icons as below
            ed.ui.registry.addIcon('accept', '<svg height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375.147 375.147"><g><g><polygon points="344.96,44.48 119.147,270.293 30.187,181.333 0,211.52 119.147,330.667 375.147,74.667"/></g></g></svg>');
            ed.ui.registry.addIcon('reject', '<svg height="24" enable-background="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><g><g><path d="m485.317 306.719c16.708-11.5 26.683-30.461 26.683-50.719s-9.975-39.219-26.682-50.719c-6.499-4.474-8.755-12.892-5.363-20.016 8.719-18.313 7.877-39.721-2.252-57.265-10.13-17.543-28.248-28.976-48.467-30.583-7.865-.625-14.028-6.787-14.652-14.653-1.609-20.22-13.042-38.338-30.584-48.467-17.545-10.13-38.954-10.97-57.264-2.252-7.124 3.392-15.543 1.137-20.016-5.363-11.501-16.707-30.463-26.682-50.72-26.682-20.258 0-39.218 9.975-50.719 26.682-4.473 6.499-12.891 8.754-20.016 5.363-18.313-8.717-39.72-7.876-57.265 2.252-17.544 10.129-28.976 28.248-30.583 48.467-.625 7.866-6.787 14.028-14.653 14.653-20.22 1.607-38.338 13.04-48.466 30.583-2.091 3.621-3.815 7.452-5.124 11.387-1.305 3.921.817 8.157 4.738 9.462 3.919 1.302 8.158-.817 9.462-4.738.991-2.978 2.298-5.881 3.884-8.629 7.666-13.278 21.382-21.931 36.692-23.147 15.237-1.21 27.175-13.148 28.386-28.386 1.216-15.309 9.869-29.026 23.147-36.692s29.484-8.301 43.35-1.7c13.798 6.57 30.108 2.2 38.775-10.39 8.708-12.65 23.061-20.203 38.392-20.203 15.332 0 29.684 7.553 38.392 20.203 8.667 12.589 24.973 16.96 38.775 10.39 13.867-6.602 30.072-5.965 43.349 1.7 13.277 7.666 21.931 21.382 23.148 36.692 1.21 15.237 13.148 27.176 28.386 28.386 15.309 1.216 29.026 9.87 36.692 23.147 7.666 13.278 8.301 29.484 1.7 43.35-6.571 13.801-2.201 30.109 10.39 38.775 12.65 8.707 20.203 23.06 20.203 38.392s-7.553 29.685-20.204 38.392c-12.59 8.666-16.959 24.974-10.389 38.775 6.601 13.866 5.965 30.072-1.7 43.35-7.667 13.278-21.383 21.931-36.692 23.147-15.239 1.211-27.176 13.149-28.386 28.386-1.217 15.31-9.87 29.027-23.148 36.692-13.276 7.666-29.482 8.302-43.349 1.701-13.8-6.572-30.107-2.2-38.775 10.39-8.708 12.65-23.06 20.203-38.392 20.203s-29.684-7.553-38.392-20.203c-8.667-12.592-24.976-16.96-38.775-10.39-13.867 6.602-30.073 5.966-43.35-1.7-13.278-7.666-21.931-21.382-23.147-36.692-1.211-15.237-13.149-27.175-28.386-28.386-15.309-1.216-29.026-9.869-36.692-23.147s-8.302-29.484-1.7-43.35c6.57-13.801 2.201-30.108-10.39-38.775-12.651-8.708-20.203-23.06-20.203-38.392s7.553-29.684 20.203-38.392c12.591-8.667 16.96-24.974 10.39-38.775-.792-1.663-1.493-3.392-2.083-5.14-1.323-3.915-5.568-6.014-9.484-4.694-3.915 1.323-6.016 5.569-4.694 9.484.779 2.306 1.704 4.587 2.748 6.782 3.392 7.124 1.137 15.542-5.362 20.016-16.708 11.501-26.683 30.461-26.683 50.719s9.975 39.218 26.683 50.719c6.499 4.474 8.754 12.892 5.362 20.016-8.718 18.313-7.877 39.721 2.253 57.265 10.129 17.544 28.247 28.976 48.466 30.583 7.866.625 14.028 6.787 14.653 14.653 1.606 20.22 13.039 38.338 30.583 48.467 17.543 10.13 38.951 10.971 57.266 2.252 7.124-3.39 15.542-1.136 20.016 5.363 11.5 16.707 30.46 26.682 50.718 26.682 20.257 0 39.219-9.975 50.719-26.682 4.475-6.499 12.895-8.754 20.016-5.363 18.313 8.718 39.72 7.876 57.264-2.252 17.543-10.128 28.976-28.246 30.583-48.468.625-7.865 6.787-14.027 14.652-14.652 20.219-1.606 38.338-13.039 48.467-30.583s10.97-38.952 2.252-57.265c-3.39-7.124-1.135-15.542 5.364-20.016z"/><path d="m409.571 335.317c3.75 1.741 8.198.117 9.941-3.63 11.097-23.862 16.723-49.404 16.723-75.919 0-99.382-80.853-180.235-180.235-180.235s-180.235 80.854-180.235 180.236 80.853 180.235 180.235 180.235c28.985 0 56.665-6.672 82.272-19.832 24.422-12.551 46.013-30.859 62.439-52.946 2.467-3.315 1.778-8.003-1.538-10.469s-8.002-1.777-10.469 1.539c-15.069 20.262-34.873 37.056-57.271 48.566-23.471 12.062-48.85 18.178-75.432 18.178-91.13 0-165.27-74.14-165.27-165.271 0-91.13 74.14-165.27 165.27-165.27 91.131 0 165.271 74.14 165.271 165.27 0 24.318-5.157 47.738-15.328 69.608-1.744 3.747-.12 8.197 3.627 9.94z"/><path d="m356.551 191.901c0-9.798-3.815-19.01-10.744-25.938-14.137-14.142-37.739-14.139-51.877 0-.056.056-37.93 37.93-37.93 37.93l-37.929-37.929c-14.075-14.078-37.774-14.103-51.878 0-6.929 6.929-10.745 16.14-10.745 25.939 0 9.798 3.816 19.01 10.745 25.939l37.93 37.929-37.93 37.929c-6.929 6.929-10.745 16.14-10.745 25.939 0 9.798 3.816 19.01 10.744 25.938 6.928 6.929 16.14 10.745 25.939 10.745s19.011-3.816 25.939-10.745l37.93-37.93 37.929 37.929c6.927 6.93 16.14 10.746 25.939 10.746s19.011-3.816 25.938-10.744c6.93-6.929 10.745-16.14 10.745-25.939s-3.815-19.011-10.744-25.939l-37.93-37.93 37.929-37.929c6.93-6.93 10.745-16.141 10.745-25.94zm-21.327 15.357-43.22 43.22c-2.922 2.922-2.922 7.66 0 10.582l43.221 43.221c4.103 4.102 6.361 9.556 6.361 15.357 0 5.8-2.258 11.254-6.362 15.357-4.102 4.102-9.555 6.361-15.357 6.361s-11.255-2.259-15.356-6.362l-43.221-43.22c-1.461-1.461-3.376-2.192-5.291-2.192s-3.83.731-5.291 2.192l-43.221 43.221c-4.101 4.102-9.555 6.361-15.357 6.361s-11.255-2.259-15.357-6.362c-4.103-4.102-6.362-9.555-6.362-15.356s2.259-11.255 6.362-15.357l43.22-43.22c2.922-2.922 2.922-7.66 0-10.582l-43.22-43.22c-4.102-4.102-6.362-9.556-6.362-15.357s2.259-11.255 6.362-15.357c8.362-8.362 22.371-8.344 30.714 0l43.22 43.22c2.921 2.923 7.658 2.922 10.582 0l43.221-43.221c4.102-4.102 9.555-6.361 15.357-6.361 5.801 0 11.254 2.259 15.357 6.362 4.103 4.102 6.361 9.556 6.361 15.357s-2.257 11.254-6.361 15.356z"/></g></g></svg>');
            ed.ui.registry.addIcon('accept_all', '<svg height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 495.787 495.787"><g><g><g><rect x="-9.583" y="294.975" transform="matrix(-0.7071 -0.7071 0.7071 -0.7071 -96.2081 592.7892)" width="168.499" height="42.69"/><polygon points="375.147,134.987 344.96,104.8 209.707,240.16 239.893,270.347"/><polygon points="465.707,104.8 239.787,330.613 150.827,241.653 120.64,271.84 239.787,390.987 495.787,134.987"/></g></g></g></svg>');
            ed.ui.registry.addIcon('reject_all', '<svg height="24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><g><g><path d="M256,0C114.844,0,0,114.844,0,256s114.844,256,256,256s256-114.844,256-256S397.156,0,256,0z M256,448\t\t\tc-105.865,0-192-86.135-192-192c0-40.406,12.25-78.604,35.542-111.198l267.656,267.656C334.604,435.75,296.406,448,256,448z\t\t\t M412.458,367.198L144.802,99.542C177.396,76.25,215.594,64,256,64c105.865,0,192,86.135,192,192 C448,296.406,435.75,334.604,412.458,367.198z"/></g></g></svg>');
			//ed.ui.registry.addIcon('tracker', '<svg height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M528 336c-48.6 0-88 39.4-88 88s39.4 88 88 88 88-39.4 88-88-39.4-88-88-88zm0 112c-13.23 0-24-10.77-24-24s10.77-24 24-24 24 10.77 24 24-10.77 24-24 24zm80-288h-64v-40.2c0-14.12 4.7-27.76 13.15-38.84 4.42-5.8 3.55-14.06-1.32-19.49L534.2 37.3c-6.66-7.45-18.32-6.92-24.7.78C490.58 60.9 480 89.81 480 119.8V160H377.67L321.58 29.14A47.914 47.914 0 0 0 277.45 0H144c-26.47 0-48 21.53-48 48v146.52c-8.63-6.73-20.96-6.46-28.89 1.47L36 227.1c-8.59 8.59-8.59 22.52 0 31.11l5.06 5.06c-4.99 9.26-8.96 18.82-11.91 28.72H22c-12.15 0-22 9.85-22 22v44c0 12.15 9.85 22 22 22h7.14c2.96 9.91 6.92 19.46 11.91 28.73l-5.06 5.06c-8.59 8.59-8.59 22.52 0 31.11L67.1 476c8.59 8.59 22.52 8.59 31.11 0l5.06-5.06c9.26 4.99 18.82 8.96 28.72 11.91V490c0 12.15 9.85 22 22 22h44c12.15 0 22-9.85 22-22v-7.14c9.9-2.95 19.46-6.92 28.72-11.91l5.06 5.06c8.59 8.59 22.52 8.59 31.11 0l31.11-31.11c8.59-8.59 8.59-22.52 0-31.11l-5.06-5.06c4.99-9.26 8.96-18.82 11.91-28.72H330c12.15 0 22-9.85 22-22v-6h80.54c21.91-28.99 56.32-48 95.46-48 18.64 0 36.07 4.61 51.8 12.2l50.82-50.82c6-6 9.37-14.14 9.37-22.63V192c.01-17.67-14.32-32-31.99-32zM176 416c-44.18 0-80-35.82-80-80s35.82-80 80-80 80 35.82 80 80-35.82 80-80 80zm22-256h-38V64h106.89l41.15 96H198z"/></svg>');
			ed.ui.registry.addIcon('tracker', '<svg height="24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19.07 4.93l-1.41 1.41C19.1 7.79 20 9.79 20 12c0 4.42-3.58 8-8 8s-8-3.58-8-8c0-4.08 3.05-7.44 7-7.93v2.02C8.16 6.57 6 9.03 6 12c0 3.31 2.69 6 6 6s6-2.69 6-6c0-1.66-.67-3.16-1.76-4.24l-1.41 1.41C15.55 9.9 16 10.9 16 12c0 2.21-1.79 4-4 4s-4-1.79-4-4c0-1.86 1.28-3.41 3-3.86v2.14c-.6.35-1 .98-1 1.72 0 1.1.9 2 2 2s2-.9 2-2c0-.74-.4-1.38-1-1.72V2h-1C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-2.76-1.12-5.26-2.93-7.07z"/></svg>');
			ed.ui.registry.addIcon('show_track_changes', '<svg height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M572.52 241.4C518.29 135.59 410.93 64 288 64S57.68 135.64 3.48 241.41a32.35 32.35 0 0 0 0 29.19C57.71 376.41 165.07 448 288 448s230.32-71.64 284.52-177.41a32.35 32.35 0 0 0 0-29.19zM288 400a144 144 0 1 1 144-144 143.93 143.93 0 0 1-144 144zm0-240a95.31 95.31 0 0 0-25.31 3.79 47.85 47.85 0 0 1-66.9 66.9A95.78 95.78 0 1 0 288 160z"/></svg>');

            //  ______         _    _
            // | ___ \       | |  | |
            // | |_/ / _   _ | |_ | |_   ___   _ __   ___
            // | ___ \| | | || __|| __| / _ \ | '_ \ / __|
            // | |_/ /| |_| || |_ | |_ | (_) || | | |\__ \
            // \____/  \__,_| \__| \__| \___/ |_| |_||___/

            ed.ui.registry.addToggleButton('iceaccept', {
                tooltip: 'Accept Change',
                icon: 'accept',
                onAction: (_) => ed.execCommand('iceaccept'),
                onSetup: (buttonApi) => {
                    var self = buttonApi;
                    const editorEventCallback = (eventApi) => {
		                    ed.plugins.ice.acceptButton = self;
                        ed.plugins.ice.acceptButton.disabled = self.disabled;                };
                    ed.on('init', editorEventCallback);
		                    ed.on('NodeChange', function (e) {
		                        if (isInsideChangeTag(e.element)) {
                            self.setDisabled(false);
		                        } else {
                            self.setDisabled(true);
		                        }
		                    });
                    return (buttonApi) => ed.off('init', editorEventCallback);
                }
			});

            ed.ui.registry.addToggleButton('icereject', {
                tooltip: 'Reject Change',
                icon: 'reject',
                onAction: (_) => ed.execCommand('icereject'),
                onSetup: (buttonApi) => {
                    var self = buttonApi;
                    const editorEventCallback = (eventApi) => {
		                    ed.plugins.ice.rejectButton = self;
                        ed.plugins.ice.rejectButton.disabled = self.disabled;                    };
                    ed.on('init', editorEventCallback);
		                    ed.on('NodeChange', function (e) {
		                        if (isInsideChangeTag(e.element)) {
                            self.setDisabled(false);
		                        } else {
                            self.setDisabled(true);
		                        }
		                    });
                    return (buttonApi) => ed.off('init', editorEventCallback);
		                }
			});
	
            ed.ui.registry.addButton('iceacceptall', {
                tooltip: 'Accept All Changes',
                icon: 'accept_all',
                onAction: (_) => ed.execCommand('iceacceptall'),
                onSetup: (buttonApi) => {
                    var self = buttonApi;
                    const editorEventCallback = (eventApi) => {
		                    ed.plugins.ice.acceptAllButton = self;
		                    ed.plugins.ice.acceptAllButton.disabled = self.disabled;
                    };
                    ed.on('init', editorEventCallback);
                    return (buttonApi) => ed.off('init', editorEventCallback);
		                }
			});

            ed.ui.registry.addButton('icerejectall', {
                tooltip: 'Reject All Changes',
                icon: 'reject_all',
                onAction: (_) => ed.execCommand('icerejectall'),
                onSetup: (buttonApi) => {
                    var self = buttonApi;
                    const editorEventCallback = (eventApi) => {
		                    ed.plugins.ice.rejectAllButton = self;
		                    ed.plugins.ice.rejectAllButton.disabled = self.disabled;
                    };
                    ed.on('init', editorEventCallback);
                    return (buttonApi) => ed.off('init', editorEventCallback);
		                }
			});
			
            ed.ui.registry.addToggleButton('ice_toggleshowchanges', {
                tooltip: 'Show/Hide Track Changes',
                icon: 'show_track_changes',
                onAction: (_) => {
		                    ed.fire('ice_toggleshowchanges');
		                    ed.execCommand('ice_toggleshowchanges');
		                },
                onSetup: (buttonApi) => {
                    var self = buttonApi;
                    const editorEventCallback = (eventApi) => {
		                    ed.plugins.ice.showChangesButton = self;
		                    ed.plugins.ice.showChangesButton.disabled = self.disabled;
		                    ed.plugins.ice.showChangesButton.active = self.active;
                    };
                    ed.on('init', editorEventCallback);

					if (ed.plugins.ice.isTracking)
						self.setActive(true);

					return (buttonApi) => ed.off('init', editorEventCallback);
		                }
			});
			
            ed.ui.registry.addToggleButton('ice_smartquotes', {
                icon: 'rejectAll',
                tooltip: 'Convert quotes to smart quotes',
                onAction: (_) => ed.execCommand('ice_smartquotes')
			});
			
            ed.ui.registry.addToggleButton('ice_togglechanges', {
                tooltip: 'Turn On Track Changes',
                icon: 'tracker',
                onAction: (_) => {
                    ed.execCommand('ice_togglechanges');
                },
                onSetup: (buttonApi) => {
                    var self = buttonApi;
                    const editorEventCallback = (eventApi) => {
		                    ed.plugins.ice.trackChangesButton = self;
		                    ed.plugins.ice.trackChangesButton.disabled = self.disabled;
		                    ed.plugins.ice.trackChangesButton.active = self.active;
                    };
                    ed.on('init', editorEventCallback);

					if (ed.plugins.ice.isTracking)
						self.setActive(true);

					return (buttonApi) => ed.off('init', editorEventCallback);
		                }
			});
			

            // ___  ___                      _____  _
            // |  \/  |                     |_   _|| |
            // | .  . |  ___  _ __   _   _    | |  | |_   ___  _ __ ___
            // | |\/| | / _ \| '_ \ | | | |   | |  | __| / _ \| '_ ` _ \
            // | |  | ||  __/| | | || |_| |  _| |_ | |_ |  __/| | | | | |
            // \_|  |_/ \___||_| |_| \__,_|  \___/  \__| \___||_| |_| |_|

			ed.ui.registry.addNestedMenuItem('nesteditem', {
				text: 'ICE action',
				getSubmenuItems: () => {
					return [{
						type: 'menuitem',
						icon: 'accept',
						text: 'Accept Change',
						onAction: (_) =>  ed.execCommand('iceaccept'),
					}, {
						type: 'menuitem',
						icon: 'reject',
						text: 'Reject Change',
						onAction: (_) =>  ed.execCommand('icereject'),
					}];
				}
			});

			
			/**
			 * Node Change event - watch for node changes and toggle buttons.
			 */
			ed.on('NodeChange',function(e) {
				cleanup();
			});
			
			/**
			 * Private Methods
			 */

			function isInsideChangeTag(n) {
				return !!ed.dom.getParent(n, self.insertSelector + ',' + self.deleteSelector);
			}

			function cleanup() {
				var empty = ed.dom.select(self.insertSelector + ':empty,' + self.deleteSelector + ':empty');
				ed.dom.remove(empty);
				// Browsers insert breaks into empty paragraphs as a space holder - clean that up
				// Not playing nice with Webkit...
				/*tinymce.each(ed.dom.select('br'), function(br, i) {
					var p = ed.dom.getParent(br, 'p');
					if(p && (p.innerText || p.textContent) !== '')
						ed.dom.remove(br);
				});*/
			}

		}
	});

	tinymce.PluginManager.add('ice', tinymce.plugins.IcePlugin);
})();
