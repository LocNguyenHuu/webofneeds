package won.node.facet.impl;

import com.hp.hpl.jena.rdf.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import won.node.facet.businessactivity.statemanager.BAStateManager;
import won.node.facet.businessactivity.coordinatorcompletion.BACCEventType;
import won.node.facet.businessactivity.coordinatorcompletion.BACCState;
import won.protocol.exception.IllegalMessageForConnectionStateException;
import won.protocol.exception.NoSuchConnectionException;
import won.protocol.exception.WonProtocolException;
import won.protocol.model.Connection;
import won.protocol.model.FacetType;
import won.protocol.repository.ConnectionRepository;

import java.net.URI;

/**
 * Created with IntelliJ IDEA.
 * User: Danijel
 * Date: 6.2.14.
 * Time: 15.32
 * To change this template use File | Settings | File Templates.
 */
public class BACCParticipantFacetImpl extends AbstractFacet
{
    private final Logger logger = LoggerFactory.getLogger(getClass());

    private URI facetURI = this.getFacetType().getURI();

    @Autowired
    private ConnectionRepository connectionRepository;
    private BAStateManager stateManager;

    @Override
    public FacetType getFacetType() {
        return FacetType.BACCParticipantFacet;
    }

    // particiapant -> accept
    public void openFromOwner(final Connection con, final Model content) throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
        //inform the other side
        if (con.getRemoteConnectionURI() != null) {
            executorService.execute(new Runnable() {
                @Override
                public void run() {
                    try {
                        needFacingConnectionClient.open(con, content);
                        stateManager.setStateForNeedUri(BACCState.ACTIVE.getURI(), con.getNeedURI(), con.getRemoteNeedURI(), facetURI);
                        logger.debug("Participant state: "+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), facetURI));

                    } catch (Exception e) {
                        logger.warn("caught Exception:", e);
                    }
                }
            });
        }
    }


    // Participant sends message to Coordinator
    public void textMessageFromOwner(final Connection con, final Model message) throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
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
                    NodeIterator ni = message.listObjectsOfProperty(message.getProperty(WON_BA.BASE_URI,"hasTextMessage"));
                    if(ni.hasNext())
                    {
                        messageForSending = ni.toList().get(0).toString();
                        messageForSending = messageForSending.substring(0, messageForSending.indexOf("^^http:"));
                        logger.debug("Participant sends: " + messageForSending);
                        eventType = BACCEventType.getCoordinationEventTypeFromString(messageForSending);
                    }
                    // message as MODEL
                    else {
                        ni = message.listObjectsOfProperty(message.getProperty(WON_BA.COORDINATION_MESSAGE.getURI().toString()));
                        if(ni.hasNext())
                        {
                            String eventTypeURI = ni.toList().get(0).asResource().getURI().toString();
                            eventType = BACCEventType.getBAEventTypeFromURI(eventTypeURI);
                            logger.debug("Participants sends the RDF:" );
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
                            BACCState state = BACCState.parseString(stateManager.getStateForNeedUri(con.getNeedURI(),
                              con.getRemoteNeedURI(), facetURI).toString());
                            logger.debug("Current state of the Participant: "+state.getURI().toString());
                            stateManager.setStateForNeedUri(state.transit(eventType).getURI(), con.getNeedURI(),
                              con.getRemoteNeedURI(), facetURI);
                            logger.debug("New state of the Participant:"+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), facetURI));

                            // eventType -> URI Resource
                            r = myContent.createResource(eventType.getURI().toString());
                            baseResource.addProperty(WON_BA.COORDINATION_MESSAGE, r);
                            needFacingConnectionClient.textMessage(con, myContent);
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
                } catch (WonProtocolException e) {
                    logger.warn("caught WonProtocolException:", e);
                } catch (Exception e) {
                    logger.warn("caught Exception:",e);
                }
            }
        });
    }

    // Participant receives message from Coordinator
    public void textMessageFromNeed(final Connection con, final Model message) throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
        //send to the need side
        executorService.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    logger.debug("Received message from Coordinator: " + message.toString());
                    NodeIterator it = message.listObjectsOfProperty(WON_BA.COORDINATION_MESSAGE);
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


                    BACCState state = BACCState.parseString(stateManager.getStateForNeedUri(con.getNeedURI(),
                      con.getRemoteNeedURI(), facetURI).toString());
                    logger.debug("Current state of the Participant: "+state.getURI().toString());
                    stateManager.setStateForNeedUri(state.transit(eventType).getURI(), con.getNeedURI(),
                      con.getRemoteNeedURI(), facetURI);
                    logger.debug("New state of the Participant:"+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), facetURI));

                    ownerFacingConnectionClient.textMessage(con.getConnectionURI(), message);



                    BACCEventType resendEventType = state.getResendEvent();
                    if(resendEventType!=null)
                    {
                        Model myContent = ModelFactory.createDefaultModel();
                        myContent.setNsPrefix("","no:uri");
                        Resource baseResource = myContent.createResource("no:uri");

                        if(BACCEventType.isBACCParticipantEventType(resendEventType))
                        {
                            state = BACCState.parseString(stateManager.getStateForNeedUri(con.getNeedURI(),
                              con.getRemoteNeedURI(), facetURI).toString());
                            logger.debug("Participant re-sends the previous message.");
                            logger.debug("Current state of the Participant: "+state.getURI().toString());
                            stateManager.setStateForNeedUri(state.transit(eventType).getURI(), con.getNeedURI(),
                              con.getRemoteNeedURI(), facetURI);
                            logger.debug("New state of the Participant:"+stateManager.getStateForNeedUri(con.getNeedURI(), con.getRemoteNeedURI(), facetURI));

                            // eventType -> URI Resource
                            Resource r = myContent.createResource(resendEventType.getURI().toString());
                            baseResource.addProperty(WON_BA.COORDINATION_MESSAGE, r);
                            needFacingConnectionClient.textMessage(con, myContent);
                        }
                        else
                        {
                            logger.debug("The eventType: "+eventType.getURI().toString()+" can not be triggered by Participant.");
                        }

                    }

                } catch (WonProtocolException e) {
                    logger.warn("caught WonProtocolException:", e);
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