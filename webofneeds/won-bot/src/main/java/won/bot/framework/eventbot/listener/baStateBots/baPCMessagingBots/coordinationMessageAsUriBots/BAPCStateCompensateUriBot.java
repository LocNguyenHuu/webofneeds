package won.bot.framework.eventbot.listener.baStateBots.baPCMessagingBots.coordinationMessageAsUriBots;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import won.bot.framework.eventbot.listener.baStateBots.BATestBotScript;
import won.bot.framework.eventbot.listener.baStateBots.BATestScriptAction;
import won.node.facet.impl.WON_TX;

/**
 * Created with IntelliJ IDEA.
 * User: Danijel
 * Date: 6.3.14.
 * Time: 14.52
 * To change this template use File | Settings | File Templates.
 */
public class BAPCStateCompensateUriBot extends BATestBotScript {

    @Override
    protected List<BATestScriptAction> setupActions() {
        List<BATestScriptAction> actions = new ArrayList();
        actions.add(new BATestScriptAction(true, URI.create(WON_TX
          .MESSAGE_COMPLETED.getURI()), URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(false, URI.create(WON_TX
          .MESSAGE_COMPENSATE.getURI()), URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(true, URI.create(WON_TX
          .MESSAGE_COMPENSATED.getURI()), URI.create(WON_TX.STATE_COMPENSATING.getURI())));
        return actions;
    }
}