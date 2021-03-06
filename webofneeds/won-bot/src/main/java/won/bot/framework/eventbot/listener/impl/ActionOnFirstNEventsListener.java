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

package won.bot.framework.eventbot.listener.impl;

import won.bot.framework.eventbot.EventListenerContext;
import won.bot.framework.eventbot.action.EventBotAction;
import won.bot.framework.eventbot.event.Event;
import won.bot.framework.eventbot.filter.EventFilter;
import won.bot.framework.eventbot.listener.AbstractHandleFirstNEventsListener;

/**
 * User: fkleedorfer
 * Date: 06.04.14
 */
public class ActionOnFirstNEventsListener extends AbstractHandleFirstNEventsListener
{
  private EventBotAction action;

  public ActionOnFirstNEventsListener(final EventListenerContext context, final int targetCount, final EventBotAction action) {
    super(context, targetCount);
    this.action = action;
  }

  public ActionOnFirstNEventsListener(final EventListenerContext context, final EventFilter eventFilter, final int targetCount, final EventBotAction action) {
    super(context, eventFilter, targetCount);
    this.action = action;
  }

  public ActionOnFirstNEventsListener(final EventListenerContext context, final String name, final int targetCount, final EventBotAction action) {
    super(context, name, targetCount);
    this.action = action;
  }

  public ActionOnFirstNEventsListener(final EventListenerContext context, final String name, final EventFilter eventFilter, final int targetCount, final EventBotAction action) {
    super(context, name, eventFilter, targetCount);
    this.action = action;
  }

  @Override
  protected void unsubscribe() {
    getEventListenerContext().getEventBus().unsubscribe(this);
  }

  @Override
  protected void handleFirstNTimes(final Event event) throws Exception {
    getEventListenerContext().getExecutor().execute(action.getActionTask(event, this));
  }
}
