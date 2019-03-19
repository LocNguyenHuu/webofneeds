package won.bot.framework.eventbot.listener.baStateBots.baCCMessagingBots.atomicBots.coordinationMessageAsUriBot;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import won.bot.framework.eventbot.listener.baStateBots.BATestBotScript;
import won.bot.framework.eventbot.listener.baStateBots.BATestScriptAction;
import won.bot.framework.eventbot.listener.baStateBots.NopAction;
import won.node.facet.impl.WON_TX;

/**
 * User: Danijel Date: 22.4.14.
 */
public class CompletingSPCancelingFAilingUriBot extends BATestBotScript { // CompletingSPCancelingFailingUriBot

    @Override
    protected List<BATestScriptAction> setupActions() {
        List<BATestScriptAction> actions = new ArrayList();

        // automatic
        // actions.add(new BATestScriptAction(false, "MESSAGE_CANCEL", URI.create(WON_BA.STATE_CANCELING.getURI()), 3));

        actions.add(new NopAction());
        actions.add(new BATestScriptAction(true, URI.create(WON_TX.MESSAGE_FAIL.getURI()),
                URI.create(WON_TX.STATE_CANCELING_COMPLETING.getURI())));
        actions.add(new BATestScriptAction(false, URI.create(WON_TX.MESSAGE_FAILED.getURI()),
                URI.create(WON_TX.STATE_FAILING_ACTIVE_CANCELING_COMPLETING.getURI())));

        return actions;
    }
}