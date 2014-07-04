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

package won.bot.framework.events.action.impl;

import com.hp.hpl.jena.rdf.model.Model;
import org.apache.solr.client.solrj.SolrServer;
import org.apache.solr.client.solrj.impl.CommonsHttpSolrServer;
import org.apache.solr.common.SolrInputDocument;
import won.bot.framework.events.EventListenerContext;
import won.bot.framework.events.action.BaseEventBotAction;
import won.bot.framework.events.event.Event;
import won.bot.framework.events.event.impl.NeedAddedToSolrEvent;
import won.bot.framework.events.event.impl.NeedCreatedEventForMatcher;
import won.matcher.solr.NeedSolrInputDocumentBuilder;
import won.protocol.util.NeedModelBuilder;

import java.net.MalformedURLException;

//import org.apache.solr.common.SolrInputDocument;

/**
* User: fkleedorfer
* Date: 28.03.14
*/
public class IndexNeedAction extends BaseEventBotAction
{
  private String uriListName;
  private SolrServer server;

  public IndexNeedAction(final EventListenerContext eventListenerContext)
  {
    this(eventListenerContext, null);
    init();
  }

  private void init(){
    try {
      this.server = new CommonsHttpSolrServer("http://sat001:8080/siren");
    } catch (MalformedURLException e) {
      logger.warn("could not create solr server",e);
    }
  }


  public IndexNeedAction(EventListenerContext eventListenerContext, String uriListName) {
      super(eventListenerContext);
      this.uriListName = uriListName;
  }

  @Override
  protected synchronized void doRun(Event event) throws Exception
  {
    logger.debug("adding need {} to solr server", ((NeedCreatedEventForMatcher) event).getNeedURI());
    NeedCreatedEventForMatcher needEvent = (NeedCreatedEventForMatcher) event;
    Model needModel = needEvent.getNeedModel();
    NeedSolrInputDocumentBuilder builder = new NeedSolrInputDocumentBuilder();
    NeedModelBuilder needModelBuilder = new NeedModelBuilder();
    needModelBuilder.copyValuesFromProduct(needModel);
    needModelBuilder.copyValuesToBuilder(builder);
    //we want the NTRIPLE field to contain the complete RDF data:
    //builder.setContentDescription(needModelBuilder.build());
    SolrInputDocument doc = builder.build();

    server.add(doc);
    server.commit();
    getEventListenerContext().getEventBus().publish(new NeedAddedToSolrEvent(((NeedCreatedEventForMatcher) event)
                                                                               .getNeedURI(),((NeedCreatedEventForMatcher) event).getNeedModel()));
    logger.debug("need {} added to solr", ((NeedCreatedEventForMatcher) event).getNeedURI());
  }


}