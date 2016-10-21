/*
 * Copyright 2012  Research Studios Austria Forschungsges.m.b.H.
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package won.bot.framework.eventbot.action;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import won.bot.framework.bot.BotContext;
import won.bot.framework.eventbot.EventListenerContext;
import won.bot.framework.eventbot.action.impl.mail.model.WonURI;
import won.bot.framework.eventbot.action.impl.mail.receive.util.MailContentExtractor;
import won.bot.framework.eventbot.event.Event;
import won.bot.framework.eventbot.event.impl.wonmessage.FailureResponseEvent;
import won.bot.framework.eventbot.event.impl.wonmessage.SuccessResponseEvent;
import won.bot.framework.eventbot.filter.impl.AcceptOnceFilter;
import won.bot.framework.eventbot.filter.impl.OriginalMessageUriRemoteResponseEventFilter;
import won.bot.framework.eventbot.filter.impl.OriginalMessageUriResponseEventFilter;
import won.bot.framework.eventbot.listener.EventListener;
import won.bot.framework.eventbot.listener.impl.ActionOnEventListener;
import won.protocol.message.WonMessage;

import javax.mail.Address;
import javax.mail.MessagingException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.net.URI;
import java.util.HashMap;

/**
 * User: fkleedorfer
 * Date: 02.02.14
 */
public class EventBotActionUtils
{
    private static final Logger logger = LoggerFactory.getLogger(EventBotActionUtils.class);

    public static void rememberInListIfNamePresent(EventListenerContext ctx ,URI uri, String uriListName) {
        if (uriListName != null && uriListName.trim().length() > 0){
            ctx.getBotContext().appendToNamedNeedUriList(uri, uriListName);
            logger.debug("remembering need in NamedNeedList {} ", uri);
        } else {
            ctx.getBotContext().rememberNeedUri(uri);
            logger.debug("remembering need in List {} ", uri);
        }
    }

    public static void rememberInNodeListIfNamePresent(EventListenerContext ctx, URI uri){
        ctx.getBotContext().rememberNodeUri(uri);
    }

    public static void removeFromListIfNamePresent(EventListenerContext ctx ,URI uri, String uriListName) {
        if (uriListName != null && uriListName.trim().length() > 0){
            ctx.getBotContext().removeNeedUriFromNamedNeedUriList(uri, uriListName);
            logger.debug("removing need from NamedNeedList {} ", uri);
        } else {
            ctx.getBotContext().removeNeedUri(uri);
            logger.debug("removed need from bot context {} ", uri);
        }
    }

    /**
    * Creates a listener that waits for the response to the specified message. If a SuccessResponse is received,
    * the successCallback is executed, if a FailureResponse is received, the failureCallback is executed.
    * @param outgoingMessage
    * @param successCallback
    * @param failureCallback
    * @param context
    * @return
    */
    public static EventListener makeAndSubscribeResponseListener(final WonMessage outgoingMessage,
        final EventListener successCallback, final EventListener failureCallback, EventListenerContext context) {

        //create an event listener that processes the response to the wonMessage we're about to send
        EventListener listener = new ActionOnEventListener(context,
            new AcceptOnceFilter(OriginalMessageUriResponseEventFilter.forWonMessage(outgoingMessage)),
            new BaseEventBotAction(context)
            {
                @Override
                protected void doRun(final Event event) throws Exception {
                    if (event instanceof SuccessResponseEvent) {
                        successCallback.onEvent(event);
                    } else  if (event instanceof FailureResponseEvent){
                        failureCallback.onEvent(event);
                    }
                }
            }
        );
        context.getEventBus().subscribe(SuccessResponseEvent.class, listener);
        context.getEventBus().subscribe(FailureResponseEvent.class, listener);
        return listener;
    }


    /**
    * Creates a listener that waits for the remote response to the specified message. If a SuccessResponse is received,
    * the successCallback is executed, if a FailureResponse is received, the failureCallback is executed.
    * @param outgoingMessage
    * @param successCallback
    * @param failureCallback
    * @param context
    * @return
    */
    public static EventListener makeAndSubscribeRemoteResponseListener(final WonMessage outgoingMessage,
        final EventListener successCallback, final EventListener failureCallback, EventListenerContext context) {

        //create an event listener that processes the remote response to the wonMessage we're about to send
        EventListener listener = new ActionOnEventListener(context,
            new AcceptOnceFilter(OriginalMessageUriRemoteResponseEventFilter.forWonMessage(outgoingMessage)),
            new BaseEventBotAction(context)
            {
                @Override
                protected void doRun(final Event event) throws Exception {
                    if (event instanceof SuccessResponseEvent) {
                        successCallback.onEvent(event);
                    } else  if (event instanceof FailureResponseEvent){
                        failureCallback.onEvent(event);
                    }
                }
            }
        );
        context.getEventBus().subscribe(SuccessResponseEvent.class, listener);
        context.getEventBus().subscribe(FailureResponseEvent.class, listener);
        return listener;
    }

    //Util Methods to Get/Remove/Add Uri -> MimeMessage Relation
    public static void removeUriMimeMessageRelation(EventListenerContext context, String mapName, URI needURI) {
        BotContext botContext = context.getBotContext();
        Object uriMap = botContext.get(mapName);

        if(uriMap != null && uriMap instanceof HashMap){
            ((HashMap<URI, MimeMessage>) uriMap).remove(needURI);
        }
    }

    public static MimeMessage getMimeMessageForURI(EventListenerContext context, String mapName, URI uri) {
        BotContext botContext = context.getBotContext();
        Object uriMap = botContext.get(mapName);

        if(uriMap != null && uriMap instanceof HashMap){
            return ((HashMap<URI, MimeMessage>) uriMap).get(uri);
        }
        return null;
    }

    public static void addUriMimeMessageRelation(EventListenerContext context, String mapName, URI needURI, MimeMessage mimeMessage) {
        BotContext botContext = context.getBotContext();
        Object uriMap = botContext.get(mapName);

        if(uriMap == null || !(uriMap instanceof HashMap)){
            uriMap = new HashMap<URI, MimeMessage>();
        }

        ((HashMap<URI, MimeMessage>) uriMap).put(needURI, mimeMessage);
        botContext.put(mapName, uriMap);
    }

    //Util Methods to Get/Remove/Add MailId -> URI Relation
    public static void removeMailIdWonURIRelation(EventListenerContext context, String mapName, String mailId) {
        BotContext botContext = context.getBotContext();
        Object mailIdMap = botContext.get(mapName);

        if(mailIdMap != null && mailIdMap instanceof HashMap){
            ((HashMap<String, WonURI>) mailIdMap).remove(mailId);
        }
    }

    public static WonURI getWonURIForMailId(EventListenerContext context, String mapName, String mailId) {
        BotContext botContext = context.getBotContext();
        Object mailIdMap = botContext.get(mapName);

        if(mailIdMap != null && mailIdMap instanceof HashMap){
            return ((HashMap<String, WonURI>) mailIdMap).get(mailId);
        }
        return null;
    }

    public static void addMailIdWonURIRelation(EventListenerContext context, String mapName, String mailId, WonURI uri) {
        BotContext botContext = context.getBotContext();
        Object mailIdMap = botContext.get(mapName);

        if(mailIdMap == null || !(mailIdMap instanceof HashMap)){
            mailIdMap = new HashMap<String, WonURI>();
        }

        ((HashMap<String, WonURI>) mailIdMap).put(mailId, uri);
        botContext.put(mapName, mailIdMap);
    }

    public static HashMap<String, WonURI> getMailIdURIRelations(EventListenerContext context, String mapName) {
        BotContext botContext = context.getBotContext();
        return (HashMap<String, WonURI>) botContext.get(mapName);
    }
}
