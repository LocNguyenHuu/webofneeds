package won.bot.framework.events.listener.baStateBots.baPCMessagingBots.coordinationMessageAsUriBots;

import won.bot.framework.events.listener.baStateBots.BATestBotScript;
import won.bot.framework.events.listener.baStateBots.BATestScriptAction;
import won.bot.framework.events.listener.baStateBots.WON_TX;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * Created with IntelliJ IDEA.
 * User: Danijel
 * Date: 6.3.14.
 * Time: 15.03
 * To change this template use File | Settings | File Templates.
 */
public class BAPCStateCompensateFailUriBot extends BATestBotScript {

    @Override
    protected List<BATestScriptAction> setupActions() {
        List<BATestScriptAction> actions = new ArrayList();
        actions.add(new BATestScriptAction(true, URI.create(WON_TX.MESSAGE_COMPLETED.getURI()), URI.create(WON_TX.STATE_ACTIVE.getURI())));
        actions.add(new BATestScriptAction(false, URI.create(WON_TX.MESSAGE_COMPENSATE.getURI()), URI.create(WON_TX.STATE_COMPLETED.getURI())));
        actions.add(new BATestScriptAction(true, URI.create(WON_TX.MESSAGE_FAIL.getURI()), URI.create(WON_TX.STATE_COMPENSATING.getURI())));
        actions.add(new BATestScriptAction(false, URI.create(WON_TX.MESSAGE_FAILED.getURI()), URI.create(WON_TX.STATE_FAILING_COMPENSATING.getURI())));
        return actions;
    }
}

