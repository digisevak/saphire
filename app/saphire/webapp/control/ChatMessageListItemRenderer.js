sap.ui.define([
  "sap/ui/core/Renderer",
  "sap/m/Text",
  "sap/m/Avatar"
], function (Renderer, Text, Avatar) {
  "use strict";

  var ChatMessageListItemRenderer = Renderer.extend("sap.m.ListItemBaseRenderer");

  ChatMessageListItemRenderer.renderLIContent = function (rm, control) {
      rm.openStart("div").class("sapMMessageListItem").openEnd();
      rm.openStart("div").class("sapMMessageListItemText").openEnd();
      rm.unsafeHtml(this.markdownToHtml(control.getMessage()));
      rm.close("div");

      rm.openStart("div").class("sapMMessageListItemHeader").openEnd();
      rm.renderControl(control.getAggregation("avatar"));

      rm.openStart("div").class("sapMMessageListItemInfo").openEnd();
      rm.renderControl(new Text({ text: control.getSender() }));
      rm.renderControl(new Text({ text: "|" }));
      rm.renderControl(new Text({ text: control.getDate() }));
      rm.close("div");

      rm.close("div");
      rm.close("div");
  };

  ChatMessageListItemRenderer.markdownToHtml = function (text) {
      // Simple markdown to HTML conversion
      // You may need to include showdown library or implement your own conversion
      if (typeof showdown !== 'undefined') {
          var converter = new showdown.Converter({
              extensions: [
                  showdownHighlight({
                      pre: true,
                      auto_detection: true
                  })
              ]
          });
          converter.setFlavor("github");
          return converter.makeHtml(text);
      } else {
          // Fallback: simple text to HTML conversion
          return text.replace(/\n/g, '<br>');
      }
  };

  return ChatMessageListItemRenderer;
});