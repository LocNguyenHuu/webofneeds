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

package won.node.protocol.impl;

import com.hp.hpl.jena.query.Dataset;
import com.hp.hpl.jena.rdf.model.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import won.node.service.impl.NeedFacingConnectionCommunicationServiceImpl;
import won.protocol.exception.*;
import won.protocol.model.Connection;
import won.protocol.model.Need;
import won.protocol.model.NeedState;
import won.protocol.need.NeedProtocolNeedClientSide;
import won.protocol.need.NeedProtocolNeedService;
import won.protocol.repository.ConnectionRepository;
import won.protocol.repository.NeedRepository;
import won.protocol.service.NeedFacingNeedCommunicationService;

import java.net.URI;
import java.util.List;

//import com.hp.hpl.jena.util.ModelQueryUtil;
//import com.sun.xml.internal.bind.v2.TODO;

/**
 * User: fkleedorfer
 * Date: 02.11.12
 */
public class NeedProtocolNeedServiceImpl implements NeedProtocolNeedService
{
  private final Logger logger = LoggerFactory.getLogger(getClass());
  protected NeedFacingNeedCommunicationService needFacingNeedCommunicationService;
  protected NeedFacingConnectionCommunicationServiceImpl connectionCommunicationService;
  @Autowired
  private ConnectionRepository connectionRepository;
  @Autowired
  private NeedRepository needRepository;
  protected NeedProtocolNeedClientSide needFacingConnectionClient;

  @Override
  @Transactional(propagation = Propagation.SUPPORTS)
  public URI connect(final URI need, final URI otherNeedURI,
                     final URI otherConnectionURI,
                     final Model content, final Dataset messageEvent)
          throws NoSuchNeedException, IllegalMessageForNeedStateException, ConnectionAlreadyExistsException {
    logger.debug("need from need: CONNECT received for need {} referring to need {} with content {}", new Object[]{need, otherNeedURI, content});
    return this.needFacingNeedCommunicationService.connect(
            need, otherNeedURI, otherConnectionURI, content, messageEvent);
  }

  @Override
  @Transactional(propagation = Propagation.SUPPORTS)
  public void open(final URI connectionURI, final Model content, final Dataset messageEvent)
    throws NoSuchConnectionException, IllegalMessageForConnectionStateException, IllegalMessageForNeedStateException {
    logger.debug("need from need: OPEN received for connection {} with content {}", connectionURI, content);

    List<Connection> cons = connectionRepository.findByConnectionURI(connectionURI);
    Connection con = cons.get(0);
    List<Need> needs = needRepository.findByNeedURI(con.getNeedURI());
    if (needs.size()>0 && needs.get(0).getState()!= NeedState.ACTIVE){
      try {
        needFacingConnectionClient.close(con, content, messageEvent);
      } catch (Exception e) {
        logger.warn("caught Exception in closeFromOwner: ",e);
      }
      throw new IllegalMessageForNeedStateException(needs.get(0).getNeedURI(),"open",needs.get(0).getState());
    }
    connectionCommunicationService.open(connectionURI, content, messageEvent);
  }

  @Override
  @Transactional(propagation = Propagation.SUPPORTS)
  public void close(final URI connectionURI, final Model content, final Dataset messageEvent)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    logger.debug("need from need: CLOSE received for connection {} with content {}", connectionURI, content);
    connectionCommunicationService.close(connectionURI, content, messageEvent);
  }

  @Override
  @Transactional(propagation = Propagation.SUPPORTS)
  public void sendMessage(final URI connectionURI, final Model message, final Dataset messageEvent)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    logger.debug("need from need: MESSAGE received for connection {} with content {}", connectionURI, message);
    connectionCommunicationService.sendMessage(connectionURI, message, messageEvent);
  }


  public void setNeedFacingNeedCommunicationService(final NeedFacingNeedCommunicationService needFacingNeedCommunicationService)
  {
    this.needFacingNeedCommunicationService = needFacingNeedCommunicationService;
  }

  public void setConnectionCommunicationService(final NeedFacingConnectionCommunicationServiceImpl connectionCommunicationService)
  {
    this.connectionCommunicationService = connectionCommunicationService;
  }
  public NeedProtocolNeedClientSide getNeedFacingConnectionClient() {
    return needFacingConnectionClient;
  }

  public void setNeedFacingConnectionClient(final NeedProtocolNeedClientSide needFacingConnectionClient) {
    this.needFacingConnectionClient = needFacingConnectionClient;
  }
}
