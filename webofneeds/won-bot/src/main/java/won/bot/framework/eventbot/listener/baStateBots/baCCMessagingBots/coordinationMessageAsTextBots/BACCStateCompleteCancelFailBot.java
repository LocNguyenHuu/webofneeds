package won.bot.framework.eventbot.listener.baStateBots.baCCMessagingBots.coordinationMessageAsTextBots;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import won.bot.framework.eventbot.listener.baStateBots.BATestBotScript;
import won.bot.framework.eventbot.listener.baStateBots.BATestScriptAction;
import won.node.facet.impl.WON_TX;

/**
 * Created with IntelliJ IDEA. User: Danijel Date: 6.3.14. Time: 12.28 To change this template use File | Settings |
 * File Templates.
 */
public class BACCStateCompleteCancelFailBot extends BATestBotScript {

    @Override
    protected List<BATestScriptAction> setupActions() {
        List<BATestScriptAction> actions = new ArrayList();
        actions.add(new BATestScriptAction(false, "MESSAGE_COMPLETE", URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_CANCEL", URI.create(WON_TX.STATE_COMPLETING.getURI())));
        actions.add(
                new BATestScriptAction(true, "MESSAGE_FAIL", URI.create(WON_TX.STATE_CANCELING_COMPLETING.getURI())));
        actions.add(new BATestScriptAction(false, "MESSAGE_FAILED",
                URI.create(WON_TX.STATE_FAILING_ACTIVE_CANCELING_COMPLETING.getURI())));
        return actions;
    }
}
