package won.bot.framework.events.listener.baStateBots.baPCMessagingBots.coordinationMessageAsTextBots;

import won.bot.framework.events.listener.baStateBots.BATestBotScript;
import won.bot.framework.events.listener.baStateBots.BATestScriptAction;
import won.bot.framework.events.listener.baStateBots.WON_TX;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * User: Danijel
 * Date: 19.3.14.
 */
public class BAPCStateCompleteWithFailureBot extends BATestBotScript {

    @Override
    protected List<BATestScriptAction> setupActions() {
        List<BATestScriptAction> actions = new ArrayList();
        actions.add(new BATestScriptAction(true, "MESSAGE_CANCELED", URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_EXITED", URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_COMPLETED", URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_COMPLETED", URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_EXIT", URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_CANCEL", URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_CLOSE", URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_CANNOTCOMPLETE", URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_CANNOTCOMPLETE", URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_CLOSED", URI.create(WON_TX.STATE_CLOSING.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_CLOSED", URI.create(WON_TX.STATE_ENDED.getURI())));
        actions.add(new BATestScriptAction(true, "MESSAGE_EXIT", URI.create(WON_TX.STATE_ENDED.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_EXIT", URI.create(WON_TX.STATE_ENDED.getURI())));
        return actions;
    }
}