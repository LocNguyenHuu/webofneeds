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

package won.bot.framework.eventbot.action.impl.wonmessage.execCommand;

import won.bot.framework.eventbot.EventListenerContext;
import won.bot.framework.eventbot.action.BaseEventBotAction;
import won.bot.framework.eventbot.action.EventBotActionUtils;
import won.bot.framework.eventbot.event.ConnectionSpecificEvent;
import won.bot.framework.eventbot.event.Event;
import won.bot.framework.eventbot.event.NeedSpecificEvent;
import won.bot.framework.eventbot.event.RemoteNeedSpecificEvent;
import won.bot.framework.eventbot.event.impl.command.MessageCommandEvent;
import won.bot.framework.eventbot.event.impl.command.MessageCommandFailureEvent;
import won.bot.framework.eventbot.event.impl.command.MessageCommandNotSentEvent;
import won.bot.framework.eventbot.event.impl.command.MessageCommandSuccessEvent;
import won.bot.framework.eventbot.event.impl.wonmessage.FailureResponseEvent;
import won.bot.framework.eventbot.event.impl.wonmessage.SuccessResponseEvent;
import won.bot.framework.eventbot.listener.EventListener;
import won.protocol.exception.WonMessageBuilderException;
import won.protocol.message.WonMessage;
import won.protocol.util.RdfUtils;
import won.protocol.util.WonRdfUtils;

/**
 * Action executing a MessageCommandEvent and publishing MessageCommandSuccess and MessageCommandFailure events
 * indicating how well sending that message worked.
 *
 * The optional constructor parameter <code>messageIsSentToRemoteNode</code>, which defaults to true is used to
 * determine if response listeners for a response from the remote node are to be registered
 */
public abstract class ExecuteSendMessageCommandAction<T extends MessageCommandEvent> extends BaseEventBotAction {

    private boolean messageIsSentToRemoteNode = true;

    protected ExecuteSendMessageCommandAction(EventListenerContext eventListenerContext,
            boolean messageIsSentToRemoteNode) {
        super(eventListenerContext);
        this.messageIsSentToRemoteNode = messageIsSentToRemoteNode;
    }

    public ExecuteSendMessageCommandAction(final EventListenerContext eventListenerContext) {
        this(eventListenerContext, true);
    }

    /**
     * Constructs the message via <code>createWonMessage</code> and registers a listener for the response from the local
     * WoN node and, if <code>messageIsSenttoRemoteNode</code> is true, a listener for the response from the remote WoN
     * node.
     * 
     * @param event
     * @param executingListener
     */
    @Override
    public final void doRun(Event event, EventListener executingListener) {
        T messageCommandEvent = (T) event;
        try {
            // create the message
            WonMessage message = createWonMessage(messageCommandEvent);

            if (message == null) {
                // assume that the implementation class handles logging and error event creation.
                return;
            }

            // register listeners for the ResponseMessage generated by the own WoN node
            EventBotActionUtils.makeAndSubscribeResponseListener(message, responseEvent -> {
                if (responseEvent instanceof SuccessResponseEvent) {
                    SuccessResponseEvent successEvent = (SuccessResponseEvent) responseEvent;
                    logger.debug(makeLogMessageString(event) + " succeeded on local WoN node");
                    Event eventToPublish = createLocalNodeSuccessEvent(messageCommandEvent, message, successEvent);
                    if (eventToPublish != null) {
                        getEventListenerContext().getEventBus().publish(eventToPublish);
                    }
                }
            }, responseEvent -> {
                if (responseEvent instanceof FailureResponseEvent) {
                    FailureResponseEvent failureEvent = (FailureResponseEvent) responseEvent;
                    logger.info(makeLogMessageString(event) + " failed on local WoN node with message: {}",
                            WonRdfUtils.MessageUtils
                                    .getTextMessage(((FailureResponseEvent) responseEvent).getFailureMessage()));
                    Event eventToPublish = createLocalNodeFailureEvent(messageCommandEvent, message, failureEvent);
                    if (eventToPublish != null) {
                        getEventListenerContext().getEventBus().publish(eventToPublish);
                    }

                }
            }, getEventListenerContext());

            // register listeners for the ResponseMessage generated by the remote WoN node
            if (messageIsSentToRemoteNode) {
                EventBotActionUtils.makeAndSubscribeRemoteResponseListener(message, responseEvent -> {
                    if (responseEvent instanceof SuccessResponseEvent) {
                        SuccessResponseEvent successEvent = (SuccessResponseEvent) responseEvent;
                        logger.debug(makeLogMessageString(event) + " succeeded on remote WoN node");
                        Event eventToPublish = createRemoteNodeSuccessEvent(messageCommandEvent, message, successEvent);
                        if (eventToPublish != null) {
                            getEventListenerContext().getEventBus().publish(eventToPublish);
                        }
                    }
                }, responseEvent -> {
                    if (responseEvent instanceof FailureResponseEvent) {
                        FailureResponseEvent failureEvent = (FailureResponseEvent) responseEvent;
                        logger.info(
                                makeLogMessageString(event)
                                        + " failed on remote WoN node with message (more on loglevel 'debug'): {}",
                                WonRdfUtils.MessageUtils
                                        .getTextMessage(((FailureResponseEvent) responseEvent).getFailureMessage()));
                        if (logger.isDebugEnabled()) {
                            logger.debug("failed message: \n {}", RdfUtils.toString(message.getCompleteDataset()));
                        }
                        Event eventToPublish = createRemoteNodeFailureEvent(messageCommandEvent, message, failureEvent);
                        if (eventToPublish != null) {
                            getEventListenerContext().getEventBus().publish(eventToPublish);
                        }
                    }
                }, getEventListenerContext());
            }
            // send the message
            getEventListenerContext().getWonMessageSender().sendWonMessage(message);
            if (logger.isDebugEnabled()) {
                logger.debug(makeLogMessageString(event));
            }

        } catch (Exception e) {
            logger.warn("error executing messageCommandEvent: ", e);
            getEventListenerContext().getEventBus()
                    .publish(createMessageNotSentEvent(messageCommandEvent, e.getMessage()));
        }
    }

    /**
     * Implementations can choose to return null here if they do not want an event published.
     */
    protected abstract MessageCommandFailureEvent createRemoteNodeFailureEvent(T originalCommand,
            WonMessage messageSent, FailureResponseEvent failureResponseEvent);

    /**
     * Implementations can choose to return null here if they do not want an event published.
     */
    protected abstract MessageCommandSuccessEvent createRemoteNodeSuccessEvent(T originalCommand,
            WonMessage messageSent, SuccessResponseEvent successResponseEvent);

    /**
     * Implementations can choose to return null here if they do not want an event published.
     */
    protected abstract MessageCommandFailureEvent createLocalNodeFailureEvent(T originalCommand, WonMessage messageSent,
            FailureResponseEvent failureResponseEvent);

    /**
     * Implementations can choose to return null here if they do not want an event published.
     */
    protected abstract MessageCommandSuccessEvent createLocalNodeSuccessEvent(T originalCommand, WonMessage messageSent,
            SuccessResponseEvent successResponseEvent);

    /**
     * Implementations can choose to return null here if they do not want an event published.
     */
    protected abstract MessageCommandNotSentEvent createMessageNotSentEvent(T originalCommand, String message);

    /**
     * Implementations must return a valid WoNMessage here or perform adequate logging and publish an
     * MessageCommandFailureEvent and return null.
     */
    protected abstract WonMessage createWonMessage(T messageCommandEvent) throws WonMessageBuilderException;

    private String makeLogMessageString(Event event) {
        StringBuilder sb = new StringBuilder();
        MessageCommandEvent messageCommandEvent = (MessageCommandEvent) event;
        sb.append("sending message of type ").append(messageCommandEvent.getWonMessageType());
        if (event instanceof NeedSpecificEvent) {
            sb.append(" on behalf of need ").append(((NeedSpecificEvent) event).getNeedURI());
        }
        if (event instanceof RemoteNeedSpecificEvent) {
            sb.append(" to need ").append(((RemoteNeedSpecificEvent) event).getRemoteNeedURI());
        }
        if (event instanceof ConnectionSpecificEvent) {
            sb.append(" in connection ").append(((ConnectionSpecificEvent) event).getConnectionURI());
        }
        return sb.toString();
    }

}
