(function(colorHash) {

var exports = this, IceAddTitlePlugin;

IceAddTitlePlugin = function(ice_instance) {
  this._ice = ice_instance;
};

IceAddTitlePlugin.prototype = {
  colorHash: colorHash,

  nodeCreated: function(node, option) {
    const username = node.getAttribute(this._ice.userNameAttribute);
    const userid = node.getAttribute(this._ice.userIdAttribute);
    const time = parseInt(node.getAttribute(this._ice.timeAttribute))
    let title = (option.action || 'Modified') + ' by ' + username
        + ' - ' + ice.dom.date('m/d/Y h:ia', time)
    if (typeof this._ice.titleFormat === "function") {
      title = this._ice.titleFormat(option, username, time);
    }
    node.setAttribute('title', title);

    if (userid) {
      const hsl = colorHash.hsl(userid);
      const val = 'hsl({0}, {1}%, {2}%) !important'.format([hsl[0], hsl[1] * 100, hsl[2] * 100]);
      node.setAttribute('style', 'background-color: ' + val);
    }
  }
};

ice.dom.noInclusionInherits(IceAddTitlePlugin, ice.IcePlugin);
exports._plugin.IceAddTitlePlugin = IceAddTitlePlugin;

}).call(this.ice, new ColorHash({lightness: 0.85, saturation: 1}));
