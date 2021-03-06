package won.node.facet.impl;

import java.net.URI;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.NodeIterator;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import won.node.facet.businessactivity.coordinatorcompletion.BACCEventType;
import won.node.facet.businessactivity.coordinatorcompletion.BACCState;
import won.node.facet.businessactivity.statemanager.BAStateManager;
import won.protocol.exception.IllegalMessageForConnectionStateException;
import won.protocol.exception.NoSuchConnectionException;
import won.protocol.message.WonMessage;
import won.protocol.model.Connection;
import won.protocol.model.FacetType;
import won.protocol.repository.ConnectionRepository;
import won.protocol.util.WonRdfUtils;

/**
 * Created with IntelliJ IDEA.
 * User: Danijel
 * Date: 6.2.14.
 * Time: 15.32
 * To change this template use File | Settings | File Templates.
 */
public class BACCParticipantFacetImpl extends AbstractBAFacet
{
    private final Logger logger = LoggerFactory.getLogger(getClass());

    @Autowired
    private ConnectionRepository connectionRepository;

    @Autowired
    private BAStateManager stateManager;

    @Override
    public FacetType getFacetType() {
        return FacetType.BACCParticipantFacet;
    }

    // particiapant -> accept
    public void openFromOwner(final Connection con, final Model content, final WonMessage wonMessage)
            throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
        //inform the other side
        if (con.getRemoteConnectionURI() != null) {
            executorService.execute(new Runnable() {
                @Override
                public void run() {
                    try {
                        stateManager.setStateForNeedUri(BACCState.ACTIVE.getURI(), con.getNeedURI(), con.getRemoteNeedURI(), getFacetType().getURI());
                        storeBAStateForConnection(con, BACCState.ACTIVE.getURI());
                        logger.debug("Participant state {} for Coordinator {} ",stateManager.getStateForNeedUri(con
                          .getNeedURI(), con.getRemoteNeedURI(), getFacetType().getURI()), con.getRemoteNeedURI());
                      //TODO: use new system
                      // needFacingConnectionClient.open(con, content, wonMessage);
                    } catch (Exception e) {
                        logger.warn("caught Exception:", e);
                    }
                }
            });
        }
    }


    // Participant sends message to Coordinator
    public void sendMessageFromOwner(final Connection con, final Model message, final WonMessage wonMessage)
            throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
        final URI remoteConnectionURI = con.getRemoteConnectionURI();

        //inform the other side
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String messageForSending = new String();
                    BACCEventType eventType = null;
                    Model myContent = null;
                    Resource r = null;

                    //message (event) for sending

                    // message as TEXT
                    messageForSending = WonRdfUtils.MessageUtils.getTextMessage(message);
                    if(messageForSending != null)
                    {
                        logger.debug("Participant sends: " + messageForSending);
                        eventType = BACCEventType.getCoordinationEventTypeFromString(messageForSending);
                    }
                    // message as MODEL
                    else {
                        NodeIterator ni = message.listObjectsOfProperty(message.getProperty(WON_TX
                          .COORDINATION_MESSAGE.getURI()));
                        if (ni.hasNext())
                        {
                            String eventTypeURI = ni.toList().get(0).asResource().getURI().toString();
                            eventType = BACCEventType.getBAEventTypeFromURI(eventTypeURI);
                        }
                    }

                    myContent = ModelFactory.createDefaultModel();
                    myContent.setNsPrefix("","no:uri");
                    Resource baseResource = myContent.createResource("no:uri");

                    // message -> eventType
                    if((eventType!=null))
                    {
                        if(eventType.isBACCParticipantEventType(eventType))
                        {
                            BACCState state, newState;
                            state = BACCState.parseString(stateManager.getStateForNeedUri(con.getNeedURI(),
                              con.getRemoteNeedURI(), getFacetType().getURI()).toString());
                            logger.debug("Current state of the Participant {} for Coordinator {} ", state.getURI()
                                                                                                      .toString
                              (), con.getRemoteNeedURI());
                            newState = state.transit(eventType);
                            stateManager.setStateForNeedUri(newState.getURI(), con.getNeedURI(),
                              con.getRemoteNeedURI(), getFacetType().getURI());
                            storeBAStateForConnection(con, newState.getURI());
                            logger.debug("New state of the Participant:"+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), getFacetType().getURI()));

                            // eventType -> URI Resource
                            r = myContent.createResource(eventType.getURI().toString());
                            baseResource.addProperty(WON_TX.COORDINATION_MESSAGE, r);
                          //TODO: use new system
                          // needFacingConnectionClient.sendMessage(con, myContent, wonMessage);
                        }
                        else
                        {
                            logger.debug("The eventType: "+eventType.getURI().toString()+" can not be triggered by Participant.");
                        }

                    }
                    else
                    {
                        logger.debug("The event type denoted by "+messageForSending+" is not allowed.");
                    }
                } catch (Exception e) {
                    logger.warn("caught Exception:",e);
                }
            }
        });
    }

    // Participant receives message from Coordinator
    public void sendMessageFromNeed(final Connection con, final Model message, final WonMessage wonMessage)
            throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
        //send to the need side
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    logger.debug("Received message from Coordinator: " + message.toString());
                    NodeIterator it = message.listObjectsOfProperty(WON_TX.COORDINATION_MESSAGE);
                    if (!it.hasNext()) {
                        logger.debug("message did not contain a won-ba:coordinationMessage");
                        return;
                    }
                    RDFNode coordMsgNode = it.nextNode();
                    if (!coordMsgNode.isURIResource()){
                        logger.debug("message did not contain a won-ba:coordinationMessage URI");
                        return;
                    }

                    Resource coordMsg = coordMsgNode.asResource();
                    String sCoordMsg = coordMsg.toString(); //URI

                    // URI -> eventType
                    //2 BACCEventType eventType = BACCEventType.getCoordinationEventTypeFromURI(sCoordMsg);
                    BACCEventType eventType = BACCEventType.getBAEventTypeFromURI(sCoordMsg);

                    BACCState state, newState;
                    state = BACCState.parseString(stateManager.getStateForNeedUri(con.getNeedURI(),
                      con.getRemoteNeedURI(), getFacetType().getURI()).toString());
                    logger.debug("Current state of the Participant {}: "+state.getURI().toString());
                    newState = state.transit(eventType);
                    stateManager.setStateForNeedUri(newState.getURI(), con.getNeedURI(),
                      con.getRemoteNeedURI(), getFacetType().getURI());
                    storeBAStateForConnection(con, newState.getURI());
                    logger.debug("New state of the Participant:"+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), getFacetType().getURI()));

                  //TODO: use new system
                  // ownerFacingConnectionClient.sendMessage(con.getConnectionURI(), message, wonMessage);



                    BACCEventType resendEventType = state.getResendEvent();
                    if(resendEventType!=null)
                    {
                        Model myContent = ModelFactory.createDefaultModel();
                        myContent.setNsPrefix("","no:uri");
                        Resource baseResource = myContent.createResource("no:uri");

                        if(BACCEventType.isBACCParticipantEventType(resendEventType))
                        {
                            state = BACCState.parseString(stateManager.getStateForNeedUri(con.getNeedURI(),
                              con.getRemoteNeedURI(), getFacetType().getURI()).toString());
                            logger.debug("Participant re-sends the previous message.");
                            logger.debug("Current state of the Participant: "+state.getURI().toString());
                            newState = state.transit(resendEventType);
                            stateManager.setStateForNeedUri(newState.getURI(), con.getNeedURI(),
                              con.getRemoteNeedURI(), getFacetType().getURI());
                            storeBAStateForConnection(con, newState.getURI());
                            logger.debug("New state of the Participant:"+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), getFacetType().getURI()));

                            // eventType -> URI Resource
                            Resource r = myContent.createResource(resendEventType.getURI().toString());
                            baseResource.addProperty(WON_TX.COORDINATION_MESSAGE, r);
                          //TODO: use new system
                          // needFacingConnectionClient.sendMessage(con, myContent, wonMessage);
                        }
                        else
                        {
                            logger.debug("The eventType: "+eventType.getURI().toString()+" can not be triggered by Participant.");
                        }

                    }

                } catch (Exception e) {
                    logger.warn("caught Exception",e);
                }

            }
        });
    }

    public void setStateManager(final BAStateManager stateManager) {
      this.stateManager = stateManager;
    }
}