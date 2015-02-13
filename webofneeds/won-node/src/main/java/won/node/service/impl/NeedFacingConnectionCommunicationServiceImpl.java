/*
 * Copyright 2012  Research Studios Austria Forschungsges.m.b.H.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package won.node.service.impl;

import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import won.node.facet.impl.FacetRegistry;
import won.node.service.DataAccessService;
import won.protocol.exception.IllegalMessageForConnectionStateException;
import won.protocol.exception.NoSuchConnectionException;
import won.protocol.message.WonMessage;
import won.protocol.message.WonMessageBuilder;
import won.protocol.message.WonMessageEncoder;
import won.protocol.model.Connection;
import won.protocol.model.ConnectionEvent;
import won.protocol.model.ConnectionEventType;
import won.protocol.model.MessageEventPlaceholder;
import won.protocol.repository.*;
import won.protocol.repository.rdfstorage.RDFStorageService;
import won.protocol.service.ConnectionCommunicationService;
import won.protocol.service.WonNodeInformationService;
import won.protocol.util.DataAccessUtils;
import won.protocol.util.RdfUtils;

import java.net.URI;
import java.util.concurrent.ExecutorService;

/**
 * User: fkleedorfer
 * Date: 02.11.12
 */
@Component
public class NeedFacingConnectionCommunicationServiceImpl implements ConnectionCommunicationService
{
  private final Logger logger = LoggerFactory.getLogger(getClass());
  private FacetRegistry reg;
  private DataAccessService dataService;

  private ExecutorService executorService;

  @Autowired
  private ConnectionRepository connectionRepository;
  @Autowired
  private EventRepository eventRepository;
  @Autowired
  private RDFStorageService rdfStorageService;
  @Autowired
  private OwnerApplicationRepository ownerApplicationRepository;
  @Autowired
  private NeedRepository needRepository;
  @Autowired
  private URIService uriService;
  @Autowired
  private MessageEventRepository messageEventRepository;
  @Autowired
  private WonNodeInformationService wonNodeInformationService;

  @Override
  public void open(final URI connectionURI, final Model content, WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
      URI newMessageURI = this.wonNodeInformationService.generateEventURI();
      WonMessage newWonMessage = WonMessageBuilder.copyInboundWonMessageForLocalStorage(
        newMessageURI, connectionURI, wonMessage);
      logger.debug("STORING message with id {}", newWonMessage.getMessageURI());
      rdfStorageService.storeDataset(newWonMessage.getMessageURI(),
                                     WonMessageEncoder.encodeAsDataset(newWonMessage));

      URI connectionURIFromWonMessage = newWonMessage.getReceiverURI();

      Connection con = dataService.nextConnectionState(connectionURIFromWonMessage,
                                                       ConnectionEventType.PARTNER_OPEN);

      messageEventRepository.save(new MessageEventPlaceholder(
        connectionURIFromWonMessage, newWonMessage));
      //invoke facet implementation
      reg.get(con).openFromNeed(con, content, newWonMessage);
  }

  @Override
  public void close(final URI connectionURI, final Model content, WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {

      URI newMessageURI = this.wonNodeInformationService.generateEventURI();
      WonMessage newWonMessage = WonMessageBuilder.copyInboundWonMessageForLocalStorage(
        newMessageURI, connectionURI, wonMessage);
      logger.debug("STORING message with id {}", newWonMessage.getMessageURI());
      rdfStorageService.storeDataset(newWonMessage.getMessageURI(),
                                     WonMessageEncoder.encodeAsDataset(newWonMessage));

      URI connectionURIFromWonMessage = newWonMessage.getReceiverURI();
      Connection con = dataService.nextConnectionState(
        connectionURIFromWonMessage, ConnectionEventType.PARTNER_CLOSE);

      messageEventRepository.save(new MessageEventPlaceholder(
        connectionURIFromWonMessage, newWonMessage));

      //invoke facet implementation

      reg.get(con).closeFromNeed(con, content, newWonMessage);

  }
    @Override
    public void sendMessage(final URI connectionURI, final Model message, WonMessage wonMessage)
            throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
        URI newMessageURI = this.wonNodeInformationService.generateEventURI();
        WonMessage newWonMessage = WonMessageBuilder.copyInboundWonMessageForLocalStorage(
          newMessageURI, connectionURI, wonMessage);
        logger.debug("STORING message with id {}", newWonMessage.getMessageURI());
        rdfStorageService.storeDataset(newWonMessage.getMessageURI(),
                                       WonMessageEncoder.encodeAsDataset(newWonMessage));

        URI connectionURIFromWonMessage = newWonMessage.getReceiverURI();

        Connection con = DataAccessUtils.loadConnection(
          connectionRepository, connectionURIFromWonMessage);

        messageEventRepository.save(new MessageEventPlaceholder(
          connectionURIFromWonMessage, newWonMessage));

        //invoke facet implementation
        reg.get(con).sendMessageFromNeed(con, message, newWonMessage);

    }

  private void replaceBaseURIWithEventURI(final Model message, final Connection con, final ConnectionEvent event) {
    Resource eventNode = message.createResource(uriService.createEventURI(con, event).toString());
    RdfUtils.replaceBaseResource(message, eventNode);
  }
  /*
  @Override
  public void textMessage(final URI connectionURI, final Model message) throws NoSuchConnectionException, IllegalMessageForConnectionStateException
  {
    logger.info("SEND_TEXT_MESSAGE received from the need side for connection {} with message '{}'", connectionURI, message);
    Connection con = dataService.saveChatMessage(connectionURI,message);

    //invoke facet implementation
    reg.get(con).textMessageFromNeed(con, message);


  }       */

  public void setReg(FacetRegistry reg) {
    this.reg = reg;
  }

  public void setDataService(DataAccessService dataService) {
    this.dataService = dataService;
  }
}
