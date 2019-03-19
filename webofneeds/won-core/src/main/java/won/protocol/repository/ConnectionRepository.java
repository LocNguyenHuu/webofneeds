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

package won.protocol.repository;

import java.net.URI;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import javax.persistence.LockModeType;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import won.protocol.message.WonMessageType;
import won.protocol.model.Connection;
import won.protocol.model.ConnectionState;

/**
 * Created with IntelliJ IDEA. User: Gabriel Date: 04.11.12 Time: 16:56 To change this template use File | Settings |
 * File Templates.
 */
public interface ConnectionRepository extends WonRepository<Connection> {
    List<Connection> findByConnectionURI(URI URI);

    Connection findOneByConnectionURI(URI URI);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select con from Connection con where connectionURI = :uri")
    Optional<Connection> findOneByConnectionURIForUpdate(@Param("uri") URI uri);

    Connection findOneByConnectionURIAndVersionNot(URI URI, int version);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select con from Connection con where needURI = :needUri and remoteNeedURI = :remoteNeedUri and facetURI = :facetUri and remoteFacetURI = :remoteFacetUri")
    Optional<Connection> findOneByNeedURIAndRemoteNeedURIAndFacetURIAndRemoteFacetURIForUpdate(
            @Param("needUri") URI needURI, @Param("remoteNeedUri") URI remoteNeedURI, @Param("facetUri") URI facetUri,
            @Param("remoteFacetUri") URI remoteFacetURI);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select con from Connection con where needURI = :needUri and remoteNeedURI = :remoteNeedUri and facetURI = :facetUri and remoteFacetURI is null")
    Optional<Connection> findOneByNeedURIAndRemoteNeedURIAndFacetURIAndNullRemoteFacetForUpdate(
            @Param("needUri") URI needURI, @Param("remoteNeedUri") URI remoteNeedURI, @Param("facetUri") URI facetUri);

    List<Connection> findByNeedURI(URI URI);

    Slice<Connection> findByNeedURI(URI URI, Pageable pageable);

    List<Connection> findByNeedURIAndRemoteNeedURI(URI needURI, URI remoteNeedURI);

    List<Connection> findByNeedURIAndStateAndTypeURI(URI needURI, ConnectionState connectionState, URI facetType);

    List<Connection> findByFacetURIAndState(URI facetURI, ConnectionState connectionState);

    List<Connection> findByNeedURIAndRemoteNeedURIAndState(URI needURI, URI remoteNeedURI,
            ConnectionState connectionState);

    long countByNeedURIAndState(URI needURI, ConnectionState connectionState);

    @Query("select connectionURI from Connection")
    List<URI> getAllConnectionURIs();

    @Query("select connectionURI from Connection")
    Slice<URI> getAllConnectionURIs(Pageable pageable);

    @Query("select connectionURI from Connection where needURI = ?1")
    List<URI> getAllConnectionURIsForNeedURI(URI needURI);

    @Query("select connectionURI from Connection where needURI = ?1")
    Slice<URI> getAllConnectionURIsForNeedURI(URI needURI, Pageable pageable);

    @Query("select connectionURI from Connection where needURI = ?1 and state != ?2")
    List<URI> getConnectionURIsByNeedURIAndNotInState(URI needURI, ConnectionState connectionState);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Connection c where c.needURI = ?1 and c.state != ?2")
    List<Connection> getConnectionsByNeedURIAndNotInStateForUpdate(URI needURI, ConnectionState connectionState);

    @Query("select connectionURI from Connection where lastUpdate > :modifiedAfter")
    List<URI> findModifiedConnectionURIsAfter(@Param("modifiedAfter") Date modifiedAfter);

    /**
     * Obtains connectionURIs grouped by the connectionURI itself and with message properties attached. The paging
     * request therefore can use criteria based on aggregated messages properties of the connection, such as
     * min(msg.creationDate). For example:
     * <code>new PageRequest(0, 1, Sort.Direction.DESC, "min(msg.creationDate)"))</code>
     * 
     * @param pageable
     * @return
     */
    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (msg.senderURI = msg.parentURI or msg.receiverURI = msg.parentURI) " + "group by msg.parentURI")
    Slice<URI> getConnectionURIByActivityDate(Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where ((msg.senderURI = msg.parentURI or msg.receiverURI = msg.parentURI) and (msg.creationDate < :referenceDate))"
            + "group by msg.parentURI")
    Slice<URI> getConnectionURIByActivityDate(@Param("referenceDate") Date referenceDate, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where ((msg.senderURI = msg.parentURI or msg.receiverURI = msg.parentURI) and (msg.creationDate < :referenceDate))"
            + "group by msg.parentURI having max(msg.creationDate) < :resumeDate")
    Slice<URI> getConnectionURIsBeforeByActivityDate(@Param("resumeDate") Date resumeEventDate,
            @Param("referenceDate") Date referenceDate, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where ((msg.senderURI = msg.parentURI or msg.receiverURI = msg.parentURI) and (msg.creationDate < :referenceDate))"
            + "group by msg.parentURI having max(msg.creationDate) > :resumeDate")
    Slice<URI> getConnectionURIsAfterByActivityDate(@Param("resumeDate") Date resumeEventDate,
            @Param("referenceDate") Date referenceDate, Pageable pageable);

    /**
     * Obtains connectionURIs of the provided Need grouped by the connectionURI itself and with message properties
     * attached. The paging request therefore can use criteria based on aggregated messages properties of the
     * connection, such as min(msg.creationDate). For example:
     * <code>new PageRequest(0, 1, Sort.Direction.DESC, "min(msg.creationDate)"))</code>
     * 
     * @param needURI
     * @param pageable
     * @return
     */
    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) "
            + "   or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI) " + "group by msg.parentURI")
    Slice<URI> getConnectionURIByActivityDate(@Param("need") URI needURI, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) "
            + "   or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) and (msg.creationDate < :referenceDate)) "
            + "group by msg.parentURI")
    Slice<URI> getConnectionURIByActivityDate(@Param("need") URI needURI, @Param("referenceDate") Date referenceDate,
            Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) "
            + "   or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) and (msg.creationDate < :referenceDate)"
            + "   and (msg.messageType = :messageType)) " + "group by msg.parentURI")
    Slice<URI> getConnectionURIByActivityDate(@Param("need") URI needURI,
            @Param("messageType") WonMessageType messageType, @Param("referenceDate") Date referenceDate,
            Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) "
            + "   or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) "
            + "   and (msg.messageType = :messageType)) " + "group by msg.parentURI")
    Slice<URI> getConnectionURIByActivityDate(@Param("need") URI needURI,
            @Param("messageType") WonMessageType messageType, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) "
            + "   or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) and (msg.creationDate < :referenceDate))"
            + "group by msg.parentURI having max(msg.creationDate) < :resumeDate")
    Slice<URI> getConnectionURIsBeforeByActivityDate(@Param("need") URI needURI,
            @Param("resumeDate") Date resumeEventDate, @Param("referenceDate") Date referenceDate, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) "
            + "   and (msg.creationDate < :referenceDate) and (msg.messageType = :messageType))"
            + "group by msg.parentURI having max(msg.creationDate) < :resumeDate")
    Slice<URI> getConnectionURIsBeforeByActivityDate(@Param("need") URI needURI,
            @Param("resumeDate") Date resumeEventDate, @Param("messageType") WonMessageType messageType,
            @Param("referenceDate") Date referenceDate, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) "
            + "   or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) and (msg.creationDate < :referenceDate))"
            + "group by msg.parentURI having max(msg.creationDate) > :resumeDate")
    Slice<URI> getConnectionURIsAfterByActivityDate(@Param("need") URI needURI,
            @Param("resumeDate") Date resumeEventDate, @Param("referenceDate") Date referenceDate, Pageable pageable);

    @Query("select msg.parentURI from MessageEventPlaceholder msg "
            + "where (((msg.senderNeedURI = :need and msg.senderURI = msg.parentURI) or (msg.receiverNeedURI = :need and msg.receiverURI = msg.parentURI)) "
            + "   and (msg.creationDate < :referenceDate) and (msg.messageType = :messageType))"
            + "group by msg.parentURI having max(msg.creationDate) > :resumeDate")
    Slice<URI> getConnectionURIsAfterByActivityDate(@Param("need") URI needURI,
            @Param("resumeDate") Date resumeEventDate, @Param("messageType") WonMessageType messageType,
            @Param("referenceDate") Date referenceDate, Pageable pageable);
}
