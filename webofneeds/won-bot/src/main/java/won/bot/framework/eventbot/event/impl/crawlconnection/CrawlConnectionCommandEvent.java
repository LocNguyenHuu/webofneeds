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

package won.bot.framework.eventbot.event.impl.crawlconnection;

import java.net.URI;

import won.bot.framework.eventbot.event.BaseNeedSpecificEvent;
import won.bot.framework.eventbot.event.impl.cmd.CommandEvent;

/**
 * Initiates the validation of the data of a given connection.
 */
public class CrawlConnectionCommandEvent extends BaseNeedSpecificEvent implements CommandEvent {
    private URI connectionURI;

    public CrawlConnectionCommandEvent(URI needURI, URI connectionURI) {
        super(needURI);
        this.connectionURI = connectionURI;
    }

    public URI getConnectionURI() {
        return connectionURI;
    }
}
