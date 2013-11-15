package won.node.service.impl;

/**
 * User: LEIH-NB
 * Date: 28.10.13
 */

import com.hp.hpl.jena.rdf.model.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import won.protocol.exception.IllegalNeedContentException;
import won.protocol.exception.NoSuchNeedException;
import won.protocol.exception.WonProtocolException;
import won.protocol.model.Need;
import won.protocol.model.NeedState;
import won.protocol.model.OwnerApplication;
import won.protocol.owner.OwnerProtocolOwnerService;
import won.protocol.repository.NeedRepository;
import won.protocol.repository.OwnerApplicationRepository;
import won.protocol.service.ConnectionCommunicationService;
import won.protocol.service.NeedInformationService;
import won.protocol.service.NeedManagementService;
import won.protocol.util.DataAccessUtils;
import won.protocol.util.RdfUtils;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * User: fkleedorfer
 * Date: 02.11.12
 */
@Component
public class NeedManagementServiceImplJMSBased implements NeedManagementService
{
    final Logger logger = LoggerFactory.getLogger(getClass());
    private OwnerProtocolOwnerService ownerProtocolOwnerService;
    //used to close connections when a need is deactivated
    private ConnectionCommunicationService ownerFacingConnectionCommunicationService;
    private NeedInformationService needInformationService;
    private URIService URIService;
    private RDFStorageService rdfStorage;

    @Autowired
    private NeedRepository needRepository;

    @Autowired
    private OwnerApplicationRepository ownerApplicationRepository;

    @Override
    public URI createNeed(final URI ownerURI, final Model content, final boolean activate, String ownerApplicationID) throws IllegalNeedContentException
    {
        if (ownerURI == null) throw new IllegalArgumentException("ownerURI is not set");
        Need need = new Need();
        need.setState(activate ? NeedState.ACTIVE : NeedState.INACTIVE);
        need.setOwnerURI(ownerURI);
        need = needRepository.save(need);
        //now, create the need URI and save again
        need.setNeedURI(URIService.createNeedURI(need));
        if(need.getAuthorizedApplications()!=null)  {
            OwnerApplication ownerApplication = ownerApplicationRepository.findByOwnerApplicationId(ownerApplicationID).get(0);
            need.getAuthorizedApplications().add(ownerApplication);
        }

        else{
            List<OwnerApplication> ownerApplicationList = new ArrayList<>();
            OwnerApplication ownerApplication = new OwnerApplication();
            ownerApplication.setOwnerApplicationId(ownerApplicationID);
            ownerApplicationList.add(ownerApplication);
            need.setAuthorizedApplications(ownerApplicationList);
            logger.info("setting OwnerApp ID: "+ownerApplicationList.get(0));
        }
        logger.info("CREATED NEED-NEED URI: "+need.getNeedURI());
        logger.info("OwnerApp ID param: "+need.getAuthorizedApplications().get(0));
        logger.info("CREATED NEED-OwnerApp ID: "+need.getAuthorizedApplications().get(0));
        need = needRepository.saveAndFlush(need);
        List<Need>needs = needRepository.findByNeedURI(need.getNeedURI());
        need = needs.get(0);
        logger.info("SAVED NEED-NEED URI: "+need.getNeedURI());
        logger.info("SAVED NEED-OwnerApp ID: "+need.getAuthorizedApplications().get(0));
        String baseURI = need.getNeedURI().toString();
        RdfUtils.replaceBaseURI(content, baseURI);

        rdfStorage.storeContent(need, content);

        return need.getNeedURI();
    }


    @Override
    public void activate(final URI needURI) throws NoSuchNeedException
    {
        if (needURI == null) throw new IllegalArgumentException("needURI is not set");
        Need need = DataAccessUtils.loadNeed(needRepository, needURI);
        need.setState(NeedState.ACTIVE);
        logger.info("Setting Need State: "+ need.getState());
        needRepository.saveAndFlush(need);
    }

    @Override
    public void deactivate(final URI needURI) throws NoSuchNeedException
    {
        if (needURI == null) throw new IllegalArgumentException("needURI is not set");
        Need need = DataAccessUtils.loadNeed(needRepository, needURI);
        need.setState(NeedState.INACTIVE);
        need = needRepository.saveAndFlush(need);
        //close all connections
        Collection<URI> connectionURIs = needInformationService.listConnectionURIs(need.getNeedURI());
        for (URI connURI : connectionURIs) {
            try {
                ownerFacingConnectionCommunicationService.close(connURI, null);
            } catch (WonProtocolException e) {
                logger.warn("caught exception when trying to close connection", e);
            }
        }
    }

    private boolean isNeedActive(final Need need)
    {
        return NeedState.ACTIVE == need.getState();
    }


    public void setOwnerProtocolOwnerService(final OwnerProtocolOwnerService ownerProtocolOwnerService)
    {
        this.ownerProtocolOwnerService = ownerProtocolOwnerService;
    }

    public void setOwnerFacingConnectionCommunicationService(final ConnectionCommunicationService ownerFacingConnectionCommunicationService)
    {
        this.ownerFacingConnectionCommunicationService = ownerFacingConnectionCommunicationService;
    }

    public void setNeedInformationService(final NeedInformationService needInformationService)
    {
        this.needInformationService = needInformationService;
    }

    public void setURIService(final URIService URIService)
    {
        this.URIService = URIService;
    }

    public void setNeedRepository(final NeedRepository needRepository)
    {
        this.needRepository = needRepository;
    }

    public void setRdfStorage(RDFStorageService rdfStorage)
    {
        this.rdfStorage = rdfStorage;
    }

    public void setOwnerApplicationRepository(OwnerApplicationRepository ownerApplicationRepository) {
        this.ownerApplicationRepository = ownerApplicationRepository;
    }
}