sap.ui.define([
  "sap/m/ListItemBase",
  "./ChatMessageListItemRenderer"
], function (ListItemBase, ChatMessageListItemRenderer) {
  "use strict";

  /**
   * @namespace saphire
   */
  return ListItemBase.extend("saphire.ChatMessageListItem", {
      metadata: {
          properties: {
              message: { type: "string", group: "Misc", defaultValue: "" },
              sender: { type: "string", group: "Misc", defaultValue: "" },
              date: { type: "string", group: "Misc", defaultValue: "" }
          },
          aggregations: {
              avatar: { type: "sap.m.Avatar", multiple: false }
          }
      },

      renderer: ChatMessageListItemRenderer
  });
});